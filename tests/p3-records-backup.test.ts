import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collections,
  commitChange,
  emptyState,
  importPrototype,
  initializeDatabase,
  OwnerDatabase,
  readSpace,
} from '../src/data/indexeddb/database';
import {
  exportBackup,
  importBackup,
  restoreRecoveryPoint,
  resetDemo,
} from '../src/data/backup/service';
import { MAX_BACKUP_BYTES, parseBackup, readBackupFile } from '../src/data/backup/format';
import { restoreTrash } from '../src/data/recovery/trash';
import { removeRecord } from '../src/domain/records';
import { activeHabits, defaultHabits, setHabitActive } from '../src/domain/habits';
import { habitCounts } from '../src/domain/selectors';
import {
  captureRecordEditBaseline,
  matchesRecordEditBaseline,
} from '../src/domain/record-edit-baseline';
import { createInitialState } from '../src/data/prototype';
import { previewCopy, copyToPersonal } from '../src/data/migrations/copy';
import type { RecordKind, WorkbenchState } from '../src/domain/models';
const databases: OwnerDatabase[] = [];
async function database() {
  const db = new OwnerDatabase(`p3-test-${crypto.randomUUID()}`);
  databases.push(db);
  await initializeDatabase(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
function seed(state: WorkbenchState) {
  const date = '2026-10-14';
  state.daily = [{ date, sleep: 0, weight: null, steps: 0, note: 'body' }];
  state.wellbeing[date] = { mood: '平静', energy: 3, reason: '' };
  state.meals = [
    { id: 'meal', date, meal: '午餐', content: 'test meal', portion: '', calories: null },
  ];
  state.sessions = [{ id: 'session', date, title: 'focus', project: 'test', minutes: 30 }];
  state.habits[date] = { read: true };
  state.habitDefinitions = defaultHabits();
  state.accounts = [{ id: 'account', date, name: '测试账户', type: 'cash', amount: 12.34 }];
  state.goals = [{ id: 'goal', title: 'test goal', next: 'next', progress: 10, due: '' }];
  state.tasks = [
    { id: 'task', title: 'next', project: 'test goal', date, done: false, goalId: 'goal' },
  ];
  state.events = [
    {
      id: 'event',
      title: 'test event',
      date,
      time: '09:30',
      timezone: 'Asia/Shanghai',
      kind: '日程',
      note: '',
      done: false,
    },
  ];
  state.notes = [{ id: 'note', date, text: 'keep this note' }];
  state.extra = { retained: true };
}
describe('record lifecycle and habit history', () => {
  it.each([
    ['body', '2026-10-14', 'daily'],
    ['wellbeing', '2026-10-14', 'wellbeing'],
    ['diet', 'meal', 'meals'],
    ['work', 'session', 'sessions'],
    ['assets', 'account', 'accounts'],
    ['task', 'task', 'tasks'],
    ['note', 'note', 'notes'],
    ['event', 'event', 'events'],
    ['goal', 'goal', 'goals'],
    ['habits', '2026-10-14', 'habitLogs'],
  ] as const)(
    'deletes %s into a transactional trash group and restores the same entity',
    async (kind, id, table) => {
      const db = await database();
      await commitChange(db, 'personal', 0, seed);
      const before = await db.records(table).where('spaceId').equals('personal').first();
      const removed = await commitChange(db, 'personal', 1, (state) =>
        removeRecord(state, kind as RecordKind, id, '2026-10-14', 'read'),
      );
      expect(await db.records(table).where('spaceId').equals('personal').count()).toBe(0);
      const trash = (await db.trash.where('spaceId').equals('personal').toArray())[0]!;
      expect(trash.rows).toHaveLength(1);
      await restoreTrash(db, trash.id, removed.space.revision);
      expect(await db.records(table).where('spaceId').equals('personal').first()).toEqual(before);
      expect(await db.trash.count()).toBe(0);
      if (kind === 'goal')
        expect((await readSpace(db, 'personal')).state.tasks[0]?.goalId).toBeUndefined();
    },
  );
  it('does not overwrite a new daily record when restoring an older record with the same date', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    await commitChange(db, 'personal', 1, (state) =>
      removeRecord(state, 'body', undefined, '2026-10-14'),
    );
    const entry = (await db.trash.toArray())[0]!;
    await commitChange(db, 'personal', 2, (state) => {
      state.daily.push({ date: '2026-10-14', sleep: 8, weight: null, steps: null, note: 'new' });
    });
    await expect(restoreTrash(db, entry.id, 3)).rejects.toThrow('已有');
    expect((await readSpace(db, 'personal')).state.daily[0]?.note).toBe('new');
    expect(await db.trash.count()).toBe(1);
  });
  it('keeps data and trash unchanged when a write fails', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const before = await readSpace(db, 'personal');
    await expect(
      commitChange(db, 'personal', 1, (state) => {
        removeRecord(state, 'note', 'note', '');
        throw new Error('disk failure');
      }),
    ).rejects.toThrow('disk failure');
    expect(await readSpace(db, 'personal')).toEqual(before);
    expect(await db.trash.count()).toBe(0);
  });
  it('retains account cents and snapshots after an account is removed', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    await commitChange(db, 'personal', 1, (state) => {
      state.accounts[0]!.amount = 56.78;
    });
    await commitChange(db, 'personal', 2, (state) => removeRecord(state, 'assets', 'account', ''));
    const snapshots = await db.accountSnapshots.where('spaceId').equals('personal').toArray();
    expect(snapshots.map((row) => row.value.amountMinor).sort()).toEqual([1234, 5678]);
  });
  it('detects edits or deletion of meals, sessions, accounts, tasks and notes after an editor opens', () => {
    for (const [kind, key] of [
      ['diet', 'meals'],
      ['work', 'sessions'],
      ['assets', 'accounts'],
      ['task', 'tasks'],
      ['note', 'notes'],
    ] as const) {
      const state = emptyState();
      seed(state);
      const baseline = captureRecordEditBaseline(state);
      const id = state[key][0]!.id;
      state[key] = [] as never;
      const target =
        kind === 'assets' ? { kind, id, name: '测试账户', type: 'cash' } : { kind, id };
      expect(matchesRecordEditBaseline(baseline, state, target)).toBe(false);
    }
  });
  it('counts only plans active on each historical date and preserves stopped habit logs', () => {
    const state = emptyState();
    state.habitDefinitions = defaultHabits();
    state.habits['2026-10-13'] = { move: true };
    state.habits['2026-10-14'] = { move: true };
    setHabitActive(state, 'move', '2026-10-14', false);
    expect(activeHabits(state, '2026-10-13')).toHaveLength(3);
    expect(activeHabits(state, '2026-10-14')).toHaveLength(2);
    expect(habitCounts(state, 7).reduce((sum, row) => sum + row.planned, 0)).toBe(20);
    expect(state.habits['2026-10-14']?.move).toBe(true);
    state.habitDefinitions.push({ id: 'custom', name: 'new', periods: [{ from: '2026-10-14' }] });
    expect(habitCounts(state, 7).reduce((sum, row) => sum + row.planned, 0)).toBe(21);
    setHabitActive(state, 'move', '2026-10-14', true);
    expect(activeHabits(state, '2026-10-14')).toHaveLength(4);
  });
  it('upgrades a real version 1 database while keeping records and metadata', async () => {
    const name = `p3-upgrade-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    const index = '[spaceId+id], spaceId, [spaceId+date]';
    old.version(1).stores({
      spaces: 'id, kind',
      migrations: 'id, spaceId',
      metadata: 'key',
      accountSnapshots: index,
      ...Object.fromEntries(collections.map((table) => [table, index])),
    });
    await old.open();
    const row = {
      id: 'read',
      spaceId: 'personal',
      date: '',
      source: '未知',
      position: 0,
      createdAt: null,
      updatedAt: null,
      migratedAt: null,
      value: { id: 'read', name: '旧阅读习惯' },
    };
    await old.table('habitDefinitions').add(row);
    old.close();
    const db = new OwnerDatabase(name);
    databases.push(db);
    await db.open();
    expect(db.verno).toBe(3);
    expect((await db.records('habitDefinitions').get(['personal', 'read']))?.value.periods).toEqual(
      [{ from: '0001-01-01' }],
    );
    expect((await db.records('habitDefinitions').get(['personal', 'read']))?.createdAt).toBeNull();
    expect(await db.trash.count()).toBe(0);
  });
});
describe('complete file backups and atomic recovery', () => {
  it('checkpoints before resetting a demo space and rejects resetting personal records', async () => {
    const db = await database();
    await commitChange(db, 'demo', 0, (state) => {
      state.daily[0]!.note = 'keep demo edits';
    });
    await resetDemo(db, 'demo', 1);
    expect((await readSpace(db, 'demo')).state.daily[0]?.note).toBe('');
    const point = (await db.recoveryPoints.toArray())[0]!;
    expect(point.snapshot.records.daily.some((row) => row.value.note === 'keep demo edits')).toBe(
      true,
    );
    await expect(resetDemo(db, 'personal', 0)).rejects.toThrow('只有示例');
    expect(await db.recoveryPoints.count()).toBe(1);
  });
  it('round-trips entities, relations, metadata, snapshots, trash, recovery points and old raw archives', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const original = await exportBackup(db, '{old raw is preserved even when malformed');
    await commitChange(db, 'personal', 1, (state) => {
      state.notes[0]!.text = 'before replacement';
    });
    await importBackup(db, original, ['personal'], { id: 'personal', revision: 2 });
    await commitChange(db, 'personal', 3, (state) => removeRecord(state, 'note', 'note', ''));
    const backup = await exportBackup(db);
    const parsed = await parseBackup(JSON.stringify(backup));
    const personal = parsed.spaces.find((bundle) => bundle.space.id === 'personal')!;
    expect(personal.recoveryPoints).toHaveLength(1);
    const mismatched = structuredClone(backup);
    mismatched.spaces.find(
      (bundle) => bundle.space.id === 'personal',
    )!.recoveryPoints[0]!.snapshot.space.kind = 'demo';
    await expect(parseBackup(JSON.stringify(mismatched))).rejects.toThrow('空间');
    expect(personal.trash).toHaveLength(1);
    expect(parsed.legacyArchives).toHaveLength(1);
    const [id] = await importBackup(db, parsed, ['personal']);
    const imported = await readSpace(db, id!);
    expect(imported.state).toEqual((await readSpace(db, 'personal')).state);
    expect(await db.accountSnapshots.where('spaceId').equals(id!).count()).toBe(
      personal.accountSnapshots.length,
    );
    expect(await db.recoveryPoints.where('spaceId').equals(id!).count()).toBe(1);
    expect(await db.trash.where('spaceId').equals(id!).count()).toBe(1);
    expect(imported.state.tasks[0]?.goalId).toBe(imported.state.goals[0]?.id);
    expect(imported.state.extra).toEqual({ retained: true });
    expect((await db.legacyArchives.toArray())[0]?.raw).toBe(original.legacyArchives[0]?.raw);
  });
  it('imports by default into independent spaces without altering current records or statistics', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const before = await readSpace(db, 'personal');
    const backup = await exportBackup(db);
    const ids = await importBackup(db, backup, ['demo', 'personal']);
    expect(ids).toHaveLength(2);
    expect(await db.spaces.count()).toBe(4);
    expect(await readSpace(db, 'personal')).toEqual(before);
    expect((await db.spaces.get(ids[0]!))?.kind).toBe('demo');
    expect((await db.spaces.get(ids[1]!))?.kind).toBe('personal');
    const repeated = await importBackup(db, backup, ['personal']);
    expect((await db.spaces.get(repeated[0]!))?.name).not.toBe(
      (await db.spaces.get(ids[1]!))?.name,
    );
  });
  it('creates a recovery point before replacing and creates another before rolling back', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const backup = await exportBackup(db);
    await commitChange(db, 'personal', 1, (state) => {
      state.notes[0]!.text = 'newer';
    });
    await importBackup(db, backup, ['personal'], { id: 'personal', revision: 2 });
    expect((await readSpace(db, 'personal')).state.notes[0]?.text).toBe('keep this note');
    const point = (await db.recoveryPoints.toArray())[0]!;
    await expect(
      restoreRecoveryPoint(db, point.id, 3, () => {
        throw new Error('rollback interrupted');
      }),
    ).rejects.toThrow('interrupted');
    expect((await readSpace(db, 'personal')).state.notes[0]?.text).toBe('keep this note');
    expect(await db.recoveryPoints.count()).toBe(1);
    await restoreRecoveryPoint(db, point.id, 3);
    expect((await readSpace(db, 'personal')).state.notes[0]?.text).toBe('newer');
    expect(await db.recoveryPoints.count()).toBe(2);
  });
  it('rolls back both replacement and its checkpoint on failure and allows retry', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const backup = await exportBackup(db);
    const before = await readSpace(db, 'personal');
    await expect(
      importBackup(db, backup, ['personal'], { id: 'personal', revision: 1 }, () => {
        throw new Error('interrupted');
      }),
    ).rejects.toThrow('interrupted');
    expect(await readSpace(db, 'personal')).toEqual(before);
    expect(await db.recoveryPoints.count()).toBe(0);
    await importBackup(db, backup, ['personal'], { id: 'personal', revision: 1 });
    expect(await db.recoveryPoints.count()).toBe(1);
  });
  it('rejects stale replacement previews and prevents sample data from replacing personal records', async () => {
    const db = await database();
    const backup = await exportBackup(db);
    await commitChange(db, 'personal', 0, (state) => {
      state.notes.push({ id: 'winner', date: '2026-10-14', text: 'winner' });
    });
    await expect(
      importBackup(db, backup, ['personal'], { id: 'personal', revision: 0 }),
    ).rejects.toThrow('其他页面');
    await expect(
      importBackup(db, backup, ['demo'], { id: 'personal', revision: 1 }),
    ).rejects.toThrow('同类型');
    expect((await readSpace(db, 'personal')).state.notes[0]?.id).toBe('winner');
    expect(await db.recoveryPoints.count()).toBe(0);
  });
  it('validates IDs, relationships, field types and integer cents before any write', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, seed);
    const backup = await exportBackup(db);
    for (const mutate of [
      (file: typeof backup) => {
        file.spaces
          .find((bundle) => bundle.space.id === 'personal')!
          .records.tasks.push(
            file.spaces.find((bundle) => bundle.space.id === 'personal')!.records.tasks[0]!,
          );
      },
      (file: typeof backup) => {
        file.spaces.find((bundle) => bundle.space.id === 'personal')!.records.goals = [];
      },
      (file: typeof backup) => {
        file.spaces.find(
          (bundle) => bundle.space.id === 'personal',
        )!.records.accounts[0]!.value.amountMinor = 12.34;
      },
      (file: typeof backup) => {
        file.spaces.find(
          (bundle) => bundle.space.id === 'personal',
        )!.records.sessions[0]!.value.minutes = 'bad';
      },
    ]) {
      const bad = structuredClone(backup);
      mutate(bad);
      await expect(importBackup(db, bad, ['personal'])).rejects.toThrow();
    }
    expect(await db.spaces.count()).toBe(2);
    expect(await db.recoveryPoints.count()).toBe(0);
    expect((await readSpace(db, 'personal')).state.accounts[0]?.amount).toBe(12.34);
  });
  it.each([
    '{broken',
    'null',
    '{"format":"owner-workbench-backup","version":99}',
    '{"schemaVersion":1}',
  ])('rejects invalid or unsupported files: %s', async (text) => {
    await expect(parseBackup(text)).rejects.toThrow();
  });
  it('rejects an oversized file before reading it', async () => {
    const text = vi.fn(async () => '{large}');
    await expect(readBackupFile({ size: MAX_BACKUP_BYTES + 1, text })).rejects.toThrow('20 MB');
    expect(text).not.toHaveBeenCalled();
  });
  it('keeps migration originals verifiable after backup restore and detects altered raw content', async () => {
    const db = await database();
    const state = createInitialState();
    const id = await importPrototype(db, JSON.stringify(state), state);
    const backup = await exportBackup(db);
    const [restored] = await importBackup(db, backup, [id]);
    const roundtrip = await exportBackup(db);
    expect(
      (await parseBackup(JSON.stringify(roundtrip))).spaces.some(
        (bundle) => bundle.space.id === restored,
      ),
    ).toBe(true);
    const bad = structuredClone(backup);
    bad.spaces.find((bundle) => bundle.space.id === id)!.migrations[0]!.raw += ' ';
    await expect(parseBackup(JSON.stringify(bad))).rejects.toThrow('校验标记');
  });
  it('copies a custom habit together with its definition and keeps stable log associations', async () => {
    const db = await database();
    const state = createInitialState();
    state.habitDefinitions = [
      ...defaultHabits(),
      { id: 'custom', name: 'custom habit', periods: [{ from: '2026-10-14' }] },
    ];
    state.habits['2026-10-14']!.custom = true;
    const id = await importPrototype(db, JSON.stringify(state), state);
    const selection = {
      domain: 'habits' as const,
      from: '2026-10-14',
      to: '2026-10-14',
      includeUnknown: true,
    };
    const preview = await previewCopy(db, id, selection);
    expect(
      preview.candidates.some(
        (item) => item.table === 'habitDefinitions' && item.row.id === 'custom',
      ),
    ).toBe(true);
    await copyToPersonal(db, id, selection, preview);
    const personal = (await readSpace(db, 'personal')).state;
    expect(personal.habits['2026-10-14']?.custom).toBe(true);
    expect(activeHabits(personal, '2026-10-14').some((habit) => habit.id === 'custom')).toBe(true);
  });
});
