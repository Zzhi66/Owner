import Dexie, { type Table } from 'dexie';
import { type WorkbenchState } from '../../domain/models';
import { workbenchSchema } from '../../domain/schemas';
import { createInitialState } from '../prototype';
import { uid } from '../../domain/selectors';
import { definitionsOf } from '../../domain/habits';
import type { HabitDefinition } from '../../domain/models';

export type SpaceKind = 'personal' | 'demo' | 'prototype';
export interface Space {
  id: string;
  name: string;
  kind: SpaceKind;
  revision: number;
  createdAt: string;
  base: Omit<WorkbenchState, 'runtime'>;
}
export interface Row {
  id: string;
  spaceId: string;
  date: string;
  source: string;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
  migratedAt: string | null;
  value: Record<string, unknown>;
  copiedFrom?: { spaceId: string; id: string };
}
export const collections = [
  'daily',
  'meals',
  'sessions',
  'accounts',
  'assetHistory',
  'tasks',
  'events',
  'goals',
  'notes',
  'messages',
  'agentTasks',
  'artifacts',
  'wellbeing',
  'habitLogs',
  'habitDefinitions',
] as const;
export type Collection = (typeof collections)[number];
export interface Migration {
  id: string;
  spaceId: string;
  raw: string;
  importedAt: string;
  originalId?: string;
}
export interface DeletedRow {
  table: Collection;
  row: Row;
}
export interface TrashEntry {
  id: string;
  spaceId: string;
  deletedAt: string;
  rows: DeletedRow[];
}
export interface SpaceSnapshot {
  space: Space;
  records: Record<Collection, Row[]>;
  accountSnapshots: Row[];
  migrations: Migration[];
  trash: TrashEntry[];
}
export interface RecoveryPoint {
  id: string;
  spaceId: string;
  createdAt: string;
  label: string;
  snapshot: SpaceSnapshot;
}
export interface LegacyArchive {
  id: string;
  raw: string;
  capturedAt: string;
}
export class OwnerDatabase extends Dexie {
  spaces!: Table<Space, string>;
  migrations!: Table<Migration, string>;
  metadata!: Table<{ key: string; value: string }, string>;
  accountSnapshots!: Table<Row, [string, string]>;
  trash!: Table<TrashEntry, string>;
  recoveryPoints!: Table<RecoveryPoint, string>;
  legacyArchives!: Table<LegacyArchive, string>;
  constructor(name = 'owner.workbench.v2') {
    super(name);
    const entityIndex = '[spaceId+id], spaceId, [spaceId+date]';
    this.version(1).stores({
      spaces: 'id, kind',
      migrations: 'id, spaceId',
      metadata: 'key',
      accountSnapshots: entityIndex,
      ...Object.fromEntries(collections.map((name) => [name, entityIndex])),
    });
    this.version(2)
      .stores({ trash: 'id, spaceId, deletedAt', recoveryPoints: 'id, spaceId, createdAt' })
      .upgrade(async (transaction) => {
        await transaction
          .table('habitDefinitions')
          .toCollection()
          .modify((row: Row) => {
            if (!Array.isArray(row.value.periods)) row.value.periods = [{ from: '0001-01-01' }];
          });
      });
    this.version(3).stores({ legacyArchives: 'id, capturedAt' });
  }
  records(name: Collection): Table<Row, [string, string]> {
    return this.table(name);
  }
}
export const db = new OwnerDatabase();
export function emptyState(): WorkbenchState {
  const state = createInitialState();
  for (const key of [
    'daily',
    'meals',
    'sessions',
    'accounts',
    'assetHistory',
    'tasks',
    'events',
    'goals',
    'notes',
    'messages',
    'agentTasks',
    'artifacts',
  ] as const)
    state[key] = [];
  state.habits = {};
  state.wellbeing = {};
  state.hideMoney = true;
  return state;
}
function baseOf(state: WorkbenchState): WorkbenchState {
  const base: Record<string, unknown> = structuredClone(state);
  delete base.runtime;
  for (const name of collections) {
    if (name in base) delete base[name];
  }
  delete base.habits;
  return base as unknown as WorkbenchState;
}
function valuesOf(
  state: WorkbenchState,
  name: Collection,
): { id: string; date: string; value: Record<string, unknown> }[] {
  if (name === 'wellbeing')
    return Object.entries(state.wellbeing).map(([date, value]) => ({
      id: date,
      date,
      value: { ...value },
    }));
  if (name === 'habitDefinitions')
    return definitionsOf(state).map((value) => ({ id: value.id, date: '', value: { ...value } }));
  if (name === 'habitLogs')
    return Object.entries(state.habits).flatMap(([date, logs]) =>
      Object.entries(logs).map(([habitId, done]) => ({
        id: JSON.stringify([date, habitId]),
        date,
        value: { habitId, done },
      })),
    );
  const records = state[name] as unknown as Record<string, unknown>[];
  return records.map((record) => {
    const value = { ...record };
    if (name === 'accounts') {
      value.amountMinor = Math.round(Number(value.amount) * 100);
      delete value.amount;
      value.currency = 'CNY';
    }
    if (name === 'assetHistory') {
      value.valueMinor = Math.round(Number(value.value) * 100);
      delete value.value;
    }
    return {
      id: String(name === 'daily' || name === 'assetHistory' ? record.date : record.id),
      date: String(record.date ?? record.due ?? ''),
      value,
    };
  });
}
export function validateState(state: WorkbenchState) {
  const parsed = workbenchSchema.safeParse(state);
  if (!parsed.success)
    throw new Error(
      `记录校验失败：${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`,
    );
  for (const name of collections) {
    const entries = valuesOf(state, name);
    if (new Set(entries.map((item) => item.id)).size !== entries.length)
      throw new Error(`${name} 存在重复 ID / 日期，原始内容保留，请先核对`);
  }
  const goals = new Set(state.goals.map((item) => item.id));
  const artifacts = new Set(state.artifacts.map((item) => item.id));
  if (state.tasks.some((item) => item.goalId && !goals.has(item.goalId)))
    throw new Error('待办引用了不存在的目标');
  if (
    [...state.messages, ...state.agentTasks].some(
      (item) => item.artifactId && !artifacts.has(item.artifactId),
    )
  )
    throw new Error('记录引用了不存在的 Agent 产物');
}
export function projectSpace(space: Space, records: Record<Collection, Row[]>): WorkbenchState {
  const state = { ...structuredClone(space.base), habits: {}, wellbeing: {} } as WorkbenchState;
  for (const name of collections) {
    const rows = [...records[name]].sort((a, b) => a.position - b.position);
    if (name === 'habitDefinitions') {
      state.habitDefinitions = rows.map(
        (row) => structuredClone(row.value) as unknown as HabitDefinition,
      );
      continue;
    }
    if (name === 'habitLogs') {
      for (const row of rows) {
        state.habits[row.date] ??= {};
        state.habits[row.date]![String(row.value.habitId)] = Boolean(row.value.done);
      }
    } else if (name === 'wellbeing')
      state.wellbeing = Object.fromEntries(
        rows.map((row) => [row.date, structuredClone(row.value)]),
      ) as unknown as WorkbenchState['wellbeing'];
    else
      state[name] = rows.map((row) => {
        const value = structuredClone(row.value);
        if (name === 'accounts') {
          value.amount = Number(value.amountMinor) / 100;
          delete value.amountMinor;
          delete value.currency;
        }
        if (name === 'assetHistory') {
          value.value = Number(value.valueMinor) / 100;
          delete value.valueMinor;
          delete value.valuationKind;
        }
        return value;
      }) as never;
  }
  for (const id of new Set(Object.values(state.habits).flatMap((logs) => Object.keys(logs)))) {
    if (!state.habitDefinitions?.some((habit) => habit.id === id))
      state.habitDefinitions?.push({ id, name: '旧习惯：' + id.slice(0, 60), periods: [] });
  }
  return state;
}
export async function readSpace(
  database: OwnerDatabase,
  id: string,
): Promise<{ space: Space; state: WorkbenchState }> {
  return database.transaction(
    'r',
    [database.spaces, ...collections.map((name) => database.records(name))],
    async () => {
      const space = await database.spaces.get(id);
      if (!space) throw new Error('工作空间不存在');
      const records = {} as Record<Collection, Row[]>;
      for (const name of collections)
        records[name] = await database.records(name).where('spaceId').equals(id).toArray();
      return { space, state: projectSpace(space, records) };
    },
  );
}
/** Called only within the caller's transaction. Metadata changes only for changed records. */
async function writeRows(
  database: OwnerDatabase,
  space: Space,
  state: WorkbenchState,
  now: string,
  migrated: boolean,
) {
  const deleted: DeletedRow[] = [];
  for (const name of collections) {
    const table = database.records(name);
    const old = await table.where('spaceId').equals(space.id).toArray();
    const entries = valuesOf(state, name);
    const keep = new Set(entries.map((item) => item.id));
    deleted.push(...old.filter((row) => !keep.has(row.id)).map((row) => ({ table: name, row })));
    await table.bulkDelete(
      old.filter((row) => !keep.has(row.id)).map((row) => [row.spaceId, row.id]),
    );
    for (const [position, entry] of entries.entries()) {
      if (name === 'assetHistory')
        entry.value.valuationKind = space.kind === 'personal' ? 'manual-aggregate' : 'prototype';
      const before = old.find((row) => row.id === entry.id);
      if (before && JSON.stringify(before.value) === JSON.stringify(entry.value)) {
        if (before.position !== position) await table.put({ ...before, position });
        continue;
      }
      const row: Row = {
        ...entry,
        position,
        spaceId: space.id,
        source:
          typeof entry.value.source === 'string' && entry.value.source.trim()
            ? entry.value.source
            : before
              ? before.source
              : migrated
                ? '未知'
                : space.kind === 'demo'
                  ? '示例记录'
                  : '手动记录',
        createdAt: before ? before.createdAt : migrated ? null : now,
        updatedAt: migrated ? null : now,
        migratedAt: before ? before.migratedAt : migrated ? now : null,
        ...(before?.copiedFrom ? { copiedFrom: before.copiedFrom } : {}),
      };
      await table.put(row);
      if (name === 'accounts')
        await database.accountSnapshots.add({
          ...row,
          id: uid(),
          createdAt: migrated ? null : now,
          updatedAt: migrated ? null : now,
          value: { ...entry.value, accountId: entry.id },
        });
    }
  }
  if (deleted.length && !migrated)
    await database.trash.add({ id: uid(), spaceId: space.id, deletedAt: now, rows: deleted });
}
export const allTables = (database: OwnerDatabase) => [
  database.spaces,
  database.accountSnapshots,
  database.migrations,
  database.metadata,
  database.trash,
  database.recoveryPoints,
  database.legacyArchives,
  ...collections.map((name) => database.records(name)),
];
export async function initializeDatabase(database: OwnerDatabase) {
  const now = new Date().toISOString();
  await database.transaction('rw', allTables(database), async () => {
    for (const kind of ['personal', 'demo'] as const) {
      if (await database.spaces.get(kind)) continue;
      const state = kind === 'personal' ? emptyState() : createInitialState();
      validateState(state);
      const space: Space = {
        id: kind,
        name: kind === 'personal' ? '正式记录' : '示例体验',
        kind,
        revision: 0,
        createdAt: now,
        base: baseOf(state),
      };
      await database.spaces.add(space);
      await writeRows(database, space, state, now, kind === 'demo');
    }
  });
}
export const EDIT_CONFLICT = '记录已在其他页面更新，请核对后重新操作；当前草稿已保留。';
export async function commitChange(
  database: OwnerDatabase,
  id: string,
  revision: number,
  change: (draft: WorkbenchState) => void,
) {
  return database.transaction('rw', allTables(database), async () => {
    const current = await readSpace(database, id);
    if (current.space.revision !== revision) throw new Error(EDIT_CONFLICT);
    const draft = structuredClone(current.state);
    change(draft);
    validateState(draft);
    if (draft.goals.length > 3 && draft.goals.length > current.state.goals.length)
      throw new Error('最多保留 3 个阶段目标');
    const now = new Date().toISOString();
    await writeRows(database, current.space, draft, now, false);
    const space = { ...current.space, base: baseOf(draft), revision: revision + 1 };
    await database.spaces.put(space);
    return { space, state: draft };
  });
}
export async function importPrototype(
  database: OwnerDatabase,
  raw: string,
  state: WorkbenchState,
  beforeCommit?: () => void,
): Promise<string> {
  validateState(state);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hash = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
  return database.transaction('rw', allTables(database), async () => {
    const existing =
      (await database.migrations.get(hash)) ||
      (await database.migrations.filter((migration) => migration.originalId === hash).first());
    if (existing) return existing.spaceId;
    const now = new Date().toISOString();
    const space: Space = {
      id: `prototype-${hash}`,
      name: `原型记录 · ${now.slice(0, 10)}`,
      kind: 'prototype',
      revision: 0,
      createdAt: now,
      base: baseOf(state),
    };
    await database.spaces.add(space);
    await writeRows(database, space, state, now, true);
    await database.migrations.add({ id: hash, spaceId: space.id, raw, importedAt: now });
    beforeCommit?.();
    return space.id;
  });
}

export async function recoverExpiredAgentTasks(
  database: OwnerDatabase,
  now = new Date().toISOString(),
) {
  await database.transaction('rw', [database.records('agentTasks'), database.spaces], async () => {
    const rows = await database.records('agentTasks').toArray();
    const touched = new Set<string>();
    for (const row of rows) {
      if (
        row.value.status === 'running' &&
        (typeof row.value.runExpiresAt !== 'string' || row.value.runExpiresAt <= now)
      ) {
        await database
          .records('agentTasks')
          .put({ ...row, value: { ...row.value, status: 'interrupted' }, updatedAt: now });
        touched.add(row.spaceId);
      }
    }
    for (const id of touched) {
      const space = await database.spaces.get(id);
      if (space) await database.spaces.put({ ...space, revision: space.revision + 1 });
    }
  });
}
