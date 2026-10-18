import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { liveQuery } from 'dexie';
import {
  addDays,
  calendarDate,
  completionDate,
  createDateService,
} from '../src/shared/date/service';
import { completedToday, focusHours, periodRecords } from '../src/domain/selectors';
import {
  commitChange,
  emptyState,
  importPrototype,
  initializeDatabase,
  OwnerDatabase,
  readSpace,
  recoverExpiredAgentTasks,
} from '../src/data/indexeddb/database';
import { copyToPersonal, previewCopy } from '../src/data/migrations/copy';
import { inspectLegacy } from '../src/data/migrations/legacy';
import { createInitialState, STORAGE_KEY } from '../src/data/prototype';
const databases: OwnerDatabase[] = [];
async function database() {
  const db = new OwnerDatabase(`owner-test-${crypto.randomUUID()}`);
  databases.push(db);
  await initializeDatabase(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
describe('calendar dates and statistics', () => {
  it.each([
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2027-03-01', -1, '2027-02-28'],
    ['2026-03-08', 1, '2026-03-09'],
    ['2026-11-01', -1, '2026-10-31'],
  ])('adds calendar days across boundaries: %s', (date, offset, result) => {
    expect(addDays(date as string, offset as number)).toBe(result);
  });
  it('uses the injected clock and local calendar day across midnight', () => {
    let instant = new Date('2026-10-18T15:59:59Z');
    const service = createDateService({ now: () => instant }, 'Asia/Shanghai');
    expect(service.today()).toBe('2026-10-18');
    instant = new Date('2026-10-18T16:00:00Z');
    expect(service.today()).toBe('2026-10-19');
    expect(calendarDate(new Date('2026-01-01T01:00:00Z'), 'America/Los_Angeles')).toBe(
      '2025-12-31',
    );
  });
  it('handles both DST transitions without skipping local days', () => {
    expect(calendarDate(new Date('2026-03-08T09:59:00Z'), 'America/Los_Angeles')).toBe(
      '2026-03-08',
    );
    expect(calendarDate(new Date('2026-03-08T10:01:00Z'), 'America/Los_Angeles')).toBe(
      '2026-03-08',
    );
    expect(calendarDate(new Date('2026-11-01T08:30:00Z'), 'America/Los_Angeles')).toBe(
      '2026-11-01',
    );
    expect(calendarDate(new Date('2026-11-01T09:30:00Z'), 'America/Los_Angeles')).toBe(
      '2026-11-01',
    );
  });
  it('includes today and six preceding days, excluding future records and retaining zero', () => {
    const records = [
      { date: '2026-10-11', value: 3 },
      { date: '2026-10-12', value: 0 },
      { date: '2026-10-18', value: null },
      { date: '2026-10-19', value: 8 },
    ];
    expect(periodRecords(records, 7, '2026-10-18')).toEqual(records.slice(1, 3));
    const state = emptyState();
    state.runtime = {
      today: '2026-10-18',
      timezone: 'Asia/Shanghai',
      spaceId: 'personal',
      kind: 'personal',
    };
    state.sessions = [
      { id: 'a', date: '2026-10-18', title: 'work', project: '', minutes: 60 },
      { id: 'b', date: '2026-10-19', title: 'future', project: '', minutes: 120 },
    ];
    expect(focusHours(state, 7)).toBe(1);
  });
  it('does not invent completion dates for old tasks', () => {
    const state = emptyState();
    state.runtime = {
      today: '2026-10-18',
      timezone: 'Asia/Shanghai',
      spaceId: 'personal',
      kind: 'personal',
    };
    state.tasks = [
      { id: 'unknown', title: '', project: '', date: '2026-10-18', done: true },
      {
        id: 'known',
        title: '',
        project: '',
        date: '2026-10-16',
        done: true,
        completedAt: '2026-10-17T16:01:00Z',
      },
      { id: 'overdue', title: '', project: '', date: '2026-10-16', done: false },
    ];
    expect(completedToday(state).map((task) => task.id)).toEqual(['known']);
    expect(completionDate(undefined, 'UTC')).toBeNull();
  });
});
describe('transactional spaces and legacy migration', () => {
  it('initializes isolated empty personal and fixed sample spaces only once', async () => {
    const db = await database();
    const before = await readSpace(db, 'demo');
    await initializeDatabase(db);
    expect((await readSpace(db, 'personal')).state.daily).toEqual([]);
    expect((await readSpace(db, 'demo')).state).toEqual(before.state);
    expect((await readSpace(db, 'demo')).state.daily.at(-1)?.date).toBe('2026-10-14');
  });
  it('imports idempotently, preserving raw content, dates, unknown fields and unknown history timestamps', async () => {
    const db = await database();
    const old = createInitialState();
    old.extra = { retained: true };
    const raw = JSON.stringify(old);
    const storage = new Map([[STORAGE_KEY, raw]]);
    const report = inspectLegacy(storage.get(STORAGE_KEY)!);
    expect(report.error).toBeNull();
    expect(report.unknown).toBeGreaterThan(0);
    const id = await importPrototype(db, raw, report.state!);
    expect(await importPrototype(db, raw, report.state!)).toBe(id);
    expect(await db.spaces.count()).toBe(3);
    expect(await db.migrations.count()).toBe(1);
    expect((await readSpace(db, id)).state).toEqual(old);
    expect(storage.get(STORAGE_KEY)).toBe(raw);
    expect(
      (await db.records('accounts').where('spaceId').equals(id).first())?.createdAt,
    ).toBeNull();
    expect((await db.migrations.toArray())[0]?.raw).toBe(raw);
    expect(
      (await db.records('assetHistory').where('spaceId').equals(id).first())?.value.valuationKind,
    ).toBe('prototype');
  });
  it('rolls back all rows and migration marker on interruption, and permits a retry', async () => {
    const db = await database();
    const state = createInitialState();
    const raw = JSON.stringify(state);
    await expect(
      importPrototype(db, raw, state, () => {
        throw new Error('simulated interruption');
      }),
    ).rejects.toThrow('interruption');
    expect(await db.spaces.count()).toBe(2);
    expect(await db.migrations.count()).toBe(0);
    expect(await db.records('daily').count()).toBe(30);
    expect(await db.accountSnapshots.count()).toBe(4);
    const id = await importPrototype(db, raw, state);
    expect((await readSpace(db, id)).state.daily).toHaveLength(30);
  });
  it.each(['{broken', '{"schemaVersion":99}', 'null'])(
    'keeps invalid original input recoverable: %s',
    (raw) => {
      const report = inspectLegacy(raw);
      expect(report.raw).toBe(raw);
      expect(report.error).toBeTruthy();
      expect(report.state).toBeNull();
    },
  );
  it('rejects duplicates and broken relationships instead of silently dropping records', () => {
    const state = createInitialState();
    state.tasks.push(state.tasks[0]!);
    expect(inspectLegacy(JSON.stringify(state)).error).toContain('重复');
    state.tasks.pop();
    state.daily.push(Object.assign({}, state.daily[0]!, { id: 'legacy-extension-id' }));
    expect(inspectLegacy(JSON.stringify(state)).error).toContain('重复');
    state.daily.pop();
    state.tasks[0]!.goalId = 'missing';
    expect(inspectLegacy(JSON.stringify(state)).error).toContain('不存在');
  });
  it('rejects stale revisions and leaves the winner intact', async () => {
    const db = await database();
    const first = await readSpace(db, 'personal');
    const second = await readSpace(db, 'personal');
    await commitChange(db, 'personal', first.space.revision, (draft) => {
      draft.notes.push({ id: 'winner', date: '2026-10-18', text: 'saved' });
    });
    await expect(
      commitChange(db, 'personal', second.space.revision, (draft) => {
        draft.notes = [];
      }),
    ).rejects.toThrow('其他页面');
    expect((await readSpace(db, 'personal')).state.notes[0]?.id).toBe('winner');
  });
  it('persists across reopening, writes cents and account snapshots, and rolls back invalid writes', async () => {
    const db = await database();
    const saved = await commitChange(db, 'personal', 0, (draft) => {
      draft.accounts.push({
        id: 'cash',
        name: 'test',
        type: 'cash',
        amount: 12.34,
        date: '2026-10-18',
      });
    });
    expect((await db.records('accounts').get(['personal', 'cash']))?.value.amountMinor).toBe(1234);
    expect(await db.accountSnapshots.where('spaceId').equals('personal').count()).toBe(1);
    await expect(
      commitChange(db, 'personal', saved.space.revision, (draft) => {
        draft.accounts[0]!.amount = -1;
      }),
    ).rejects.toThrow('校验');
    db.close();
    await db.open();
    expect((await readSpace(db, 'personal')).state.accounts[0]?.amount).toBe(12.34);
  });
  it('observes committed changes from another database connection', async () => {
    const db = await database();
    const other = new OwnerDatabase(db.name);
    await other.open();
    try {
      const observed = new Promise<number>((resolve, reject) => {
        const subscription = liveQuery(() => readSpace(db, 'personal')).subscribe({
          next: (value) => {
            if (value.space.revision === 1) {
              subscription.unsubscribe();
              resolve(value.state.notes.length);
            }
          },
          error: reject,
        });
      });
      await commitChange(other, 'personal', 0, (draft) => {
        draft.notes.push({ id: 'other', date: '2026-10-18', text: 'other connection' });
      });
      expect(await observed).toBe(1);
    } finally {
      other.close();
    }
  });
  it('preserves null historical creation time when a migrated record is edited', async () => {
    const db = await database();
    const state = createInitialState();
    const id = await importPrototype(db, JSON.stringify(state), state);
    const oldTask = await db.records('tasks').get([id, state.tasks[0]!.id]);
    await commitChange(db, id, 0, (draft) => {
      draft.accounts[0]!.amount = 99;
      draft.tasks.unshift({
        id: 'new-task',
        title: 'new',
        project: '',
        date: '2026-10-14',
        done: false,
      });
    });
    const row = await db.records('accounts').get([id, state.accounts[0]!.id]);
    expect(row?.createdAt).toBeNull();
    expect(row?.updatedAt).toBeTruthy();
    expect(row?.migratedAt).toBeTruthy();
    expect(await db.records('tasks').get([id, state.tasks[0]!.id])).toEqual({
      ...oldTask,
      position: oldTask!.position + 1,
    });
    const snapshots = await db.accountSnapshots.where('spaceId').equals(id).toArray();
    expect(snapshots.filter((snapshot) => snapshot.createdAt !== null)).toHaveLength(1);
  });
  it('copies only reviewed dates and domains, preserving original dates and provenance without duplicates', async () => {
    const db = await database();
    const state = createInitialState();
    const id = await importPrototype(db, JSON.stringify(state), state);
    const selection = {
      domain: 'body' as const,
      from: '2026-10-13',
      to: '2026-10-14',
      includeUnknown: false,
    };
    const preview = await previewCopy(db, id, selection);
    expect(preview.candidates).toHaveLength(2);
    expect(await copyToPersonal(db, id, selection, preview)).toBe(2);
    const personal = await readSpace(db, 'personal');
    expect(personal.state.daily.map((row) => row.date)).toEqual(['2026-10-13', '2026-10-14']);
    expect(personal.state.meals).toEqual([]);
    expect((await db.records('daily').get(['personal', '2026-10-14']))?.createdAt).toBeNull();
    expect((await db.records('daily').get(['personal', '2026-10-14']))?.copiedFrom?.spaceId).toBe(
      id,
    );
    expect((await previewCopy(db, id, selection)).candidates).toHaveLength(0);
  });
  it('requires explicit inclusion of unknown sources, maps goal relations and blocks stale copy previews', async () => {
    const db = await database();
    const state = emptyState();
    state.goals = [{ id: 'goal', title: 'goal', next: 'next', due: '2026-12-31', progress: 10 }];
    state.tasks = [
      { id: 'task', title: 'next', project: '', date: '2026-10-14', done: false, goalId: 'goal' },
    ];
    const id = await importPrototype(db, JSON.stringify(state), state);
    const selection = {
      domain: 'work' as const,
      from: '2026-10-14',
      to: '2026-10-14',
      includeUnknown: false,
    };
    expect((await previewCopy(db, id, selection)).candidates).toHaveLength(0);
    selection.includeUnknown = true;
    const preview = await previewCopy(db, id, selection);
    expect(preview.candidates).toHaveLength(2);
    await copyToPersonal(db, id, selection, preview);
    const saved = (await readSpace(db, 'personal')).state;
    expect(saved.tasks[0]?.goalId).toBe(saved.goals[0]?.id);
    expect(saved.goals[0]?.id).not.toBe('goal');
    expect(saved.goals[0]?.due).toBe('2026-12-31');
    await expect(copyToPersonal(db, id, selection, preview)).rejects.toThrow('其他页面');
  });
  it('blocks copying over existing daily records and keeps original prototype valuations separate', async () => {
    const db = await database();
    const state = createInitialState();
    const id = await importPrototype(db, JSON.stringify(state), state);
    await commitChange(db, 'personal', 0, (draft) => {
      draft.daily.push({
        date: '2026-10-14',
        sleep: 5,
        weight: null,
        steps: null,
        note: 'personal',
      });
    });
    const selection = {
      domain: 'body' as const,
      from: '2026-10-14',
      to: '2026-10-14',
      includeUnknown: true,
    };
    const preview = await previewCopy(db, id, selection);
    expect(preview.conflicts).toHaveLength(1);
    await expect(copyToPersonal(db, id, selection, preview)).rejects.toThrow('已有');
    expect((await readSpace(db, 'personal')).state.daily[0]?.note).toBe('personal');
    const accounts = { ...selection, domain: 'assets' as const };
    const accountPreview = await previewCopy(db, id, accounts);
    await copyToPersonal(db, id, accounts, accountPreview);
    expect((await readSpace(db, 'personal')).state.assetHistory).toEqual([]);
  });
  it('interrupts expired local Agent runs without changing a still-active run', async () => {
    const db = await database();
    await commitChange(db, 'personal', 0, (draft) => {
      draft.agentTasks = [
        {
          id: 'expired',
          title: '',
          context: '',
          date: '2026-10-18',
          status: 'running',
          runExpiresAt: '2026-10-18T01:00:00Z',
        },
        {
          id: 'active',
          title: '',
          context: '',
          date: '2026-10-18',
          status: 'running',
          runExpiresAt: '2026-10-18T01:00:30Z',
        },
      ];
    });
    await recoverExpiredAgentTasks(db, '2026-10-18T01:00:15Z');
    const tasks = (await readSpace(db, 'personal')).state.agentTasks;
    expect(tasks.map((task) => task.status)).toEqual(['interrupted', 'running']);
  });
});
