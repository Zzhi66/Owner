import { z } from 'zod';
import {
  collections,
  projectSpace,
  validateState,
  type Collection,
  type Row,
  type SpaceSnapshot,
  type RecoveryPoint,
  type LegacyArchive,
} from '../indexeddb/database';
import {
  daySchema,
  entitySchemas,
  wellbeingSchema,
  habitDefinitionSchema,
} from '../../domain/schemas';
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export interface BackupSpace extends SpaceSnapshot {
  recoveryPoints: RecoveryPoint[];
}
export interface OwnerBackup {
  format: 'owner-workbench-backup';
  version: 1;
  databaseVersion: 3;
  appVersion: string;
  exportedAt: string;
  activeSpaceId?: string;
  spaces: BackupSpace[];
  legacyArchives: LegacyArchive[];
}
const id = z.string().min(1).max(256);
const instant = z.iso.datetime();
const object = z.record(z.string(), z.unknown());
const rowSchema = z
  .object({
    id,
    spaceId: id,
    date: z.union([daySchema, z.literal('')]),
    source: z.string().min(1),
    position: z.number().int().nonnegative(),
    createdAt: instant.nullable(),
    updatedAt: instant.nullable(),
    migratedAt: instant.nullable(),
    value: object,
    copiedFrom: z.object({ spaceId: id, id }).optional(),
  })
  .passthrough();
const spaceSchema = z
  .object({
    id,
    name: z.string().min(1).max(200),
    kind: z.enum(['personal', 'demo', 'prototype']),
    revision: z.number().int().nonnegative(),
    createdAt: instant,
    base: object,
  })
  .passthrough();
const migrationSchema = z
  .object({ id, spaceId: id, raw: z.string(), importedAt: instant, originalId: id.optional() })
  .passthrough();
const deletedRowSchema = z.object({ table: z.enum(collections), row: rowSchema });
const trashSchema = z.object({
  id,
  spaceId: id,
  deletedAt: instant,
  rows: z.array(deletedRowSchema).min(1),
});
const recordsSchema = z
  .object(Object.fromEntries(collections.map((name) => [name, z.array(rowSchema)])))
  .strict();
const snapshotSchema = z.object({
  space: spaceSchema,
  records: recordsSchema,
  accountSnapshots: z.array(rowSchema),
  migrations: z.array(migrationSchema),
  trash: z.array(trashSchema),
});
const recoverySchema = z.object({
  id,
  spaceId: id,
  createdAt: instant,
  label: z.string(),
  snapshot: snapshotSchema,
});
const backupSchema = z
  .object({
    format: z.literal('owner-workbench-backup'),
    version: z.literal(1),
    databaseVersion: z.literal(3),
    appVersion: z.string(),
    exportedAt: instant,
    activeSpaceId: id.optional(),
    spaces: z
      .array(snapshotSchema.extend({ recoveryPoints: z.array(recoverySchema) }))
      .min(1)
      .max(100),
    legacyArchives: z.array(z.object({ id, raw: z.string(), capturedAt: instant })),
  })
  .strict();
const unique = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} 存在重复 ID，未修改当前数据`);
};
function validateRow(table: Collection | 'accountSnapshots', row: Row, spaceId: string) {
  if (row.spaceId !== spaceId) throw new Error('记录的空间归属不一致');
  const value = row.value;
  if (table === 'habitLogs') {
    if (
      typeof value.habitId !== 'string' ||
      !value.habitId ||
      typeof value.done !== 'boolean' ||
      row.id !== JSON.stringify([row.date, value.habitId]) ||
      !daySchema.safeParse(row.date).success
    )
      throw new Error('习惯打卡的 ID、日期或内容无效');
  } else if (table === 'wellbeing') {
    if (row.id !== row.date || !daySchema.safeParse(row.date).success)
      throw new Error('心情记录的日期不一致');
  } else if (table === 'accountSnapshots') {
    if (typeof value.accountId !== 'string' || !value.accountId || row.date !== value.date)
      throw new Error('账户快照关联或日期无效');
  } else {
    const expectedId = table === 'daily' || table === 'assetHistory' ? value.date : value.id;
    if (row.id !== expectedId || row.date !== String(value.date ?? value.due ?? ''))
      throw new Error(`${table} 的 ID 或业务日期不一致`);
  }
  if (table === 'accounts' || table === 'accountSnapshots') {
    if (
      value.currency !== 'CNY' ||
      !Number.isSafeInteger(value.amountMinor) ||
      Number(value.amountMinor) < 0 ||
      'amount' in value
    )
      throw new Error('账户金额必须为人民币整数分');
  }
  if (table === 'assetHistory' && (!Number.isSafeInteger(value.valueMinor) || 'value' in value))
    throw new Error('资产历史的金额单位无效');
  if (table !== 'habitLogs') {
    const plain = { ...value };
    if (table === 'accounts' || table === 'accountSnapshots')
      plain.amount = Number(value.amountMinor) / 100;
    if (table === 'assetHistory') plain.value = Number(value.valueMinor) / 100;
    const schema =
      table === 'wellbeing'
        ? wellbeingSchema
        : table === 'habitDefinitions'
          ? habitDefinitionSchema
          : table === 'accountSnapshots'
            ? entitySchemas.accounts
            : entitySchemas[table];
    if (!schema.safeParse(plain).success) throw new Error(`${table} 的字段类型或数值范围无效`);
  }
}
export function validateSnapshot(snapshot: SpaceSnapshot) {
  let count = 0;
  for (const table of collections) {
    const rows = snapshot.records[table];
    unique(
      rows.map((row) => row.id),
      table,
    );
    count += rows.length;
    for (const row of rows) validateRow(table, row, snapshot.space.id);
  }
  unique(
    snapshot.accountSnapshots.map((row) => row.id),
    '账户快照',
  );
  for (const row of snapshot.accountSnapshots)
    validateRow('accountSnapshots', row, snapshot.space.id);
  unique(
    snapshot.migrations.map((item) => item.id),
    '迁移标记',
  );
  for (const migration of snapshot.migrations)
    if (migration.spaceId !== snapshot.space.id) throw new Error('迁移原文的空间不一致');
  unique(
    snapshot.trash.map((item) => item.id),
    '回收站',
  );
  for (const entry of snapshot.trash) {
    if (entry.spaceId !== snapshot.space.id) throw new Error('回收站的空间不一致');
    unique(
      entry.rows.map((item) => JSON.stringify([item.table, item.row.id])),
      '回收站记录',
    );
    for (const item of entry.rows) validateRow(item.table, item.row, snapshot.space.id);
  }
  const state = projectSpace(snapshot.space, snapshot.records);
  validateState(state);
  if (snapshot.space.kind !== 'prototype' && state.goals.length > 3)
    throw new Error('正式或示例空间最多保留 3 个目标');
  return (
    count +
    snapshot.accountSnapshots.length +
    snapshot.trash.reduce((sum, entry) => sum + entry.rows.length, 0)
  );
}
export async function parseBackup(text: string): Promise<OwnerBackup> {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error('备份超过 20 MB，请选择更小的文件');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('不是有效的 JSON 备份文件');
  }
  if (raw && typeof raw === 'object' && 'version' in raw && raw.version !== 1)
    throw new Error('备份版本不受支持，请使用匹配版本的应用；当前数据未改变');
  const result = backupSchema.safeParse(raw);
  if (!result.success)
    throw new Error(`备份结构无效：${result.error.issues[0]?.path.join('.')}，未修改当前数据`);
  const backup = result.data as unknown as OwnerBackup;
  unique(
    backup.spaces.map((item) => item.space.id),
    '空间',
  );
  unique(
    backup.legacyArchives.map((item) => item.id),
    '旧原文存档',
  );
  if (
    backup.activeSpaceId &&
    !backup.spaces.some((bundle) => bundle.space.id === backup.activeSpaceId)
  )
    throw new Error('备份默认空间不存在');
  let count = 0;
  const hashes = new Map<string, string>();
  for (const bundle of backup.spaces) {
    count += validateSnapshot(bundle);
    unique(
      bundle.recoveryPoints.map((point) => point.id),
      '恢复点',
    );
    for (const point of bundle.recoveryPoints) {
      if (
        point.spaceId !== bundle.space.id ||
        point.snapshot.space.id !== bundle.space.id ||
        point.snapshot.space.kind !== bundle.space.kind
      )
        throw new Error('恢复点的空间归属不一致');
      count += validateSnapshot(point.snapshot);
    }
    for (const snapshot of [bundle, ...bundle.recoveryPoints.map((point) => point.snapshot)])
      for (const migration of snapshot.migrations) {
        let hash = hashes.get(migration.raw);
        if (!hash) {
          const bytes = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(migration.raw),
          );
          hash = Array.from(new Uint8Array(bytes), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join('');
          hashes.set(migration.raw, hash);
        }
        if ((migration.originalId || migration.id) !== hash)
          throw new Error('迁移原文与校验标记不一致，未修改当前数据');
      }
  }
  if (count > 100000) throw new Error('备份记录超过 100000 条，本版本暂不支持');
  return backup;
}
export async function readBackupFile(file: Pick<File, 'size' | 'text'>): Promise<OwnerBackup> {
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_BACKUP_BYTES)
    throw new Error('备份超过 20 MB，请选择更小的文件');
  return parseBackup(await file.text());
}
