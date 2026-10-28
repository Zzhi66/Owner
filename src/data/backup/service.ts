import {
  allTables,
  collections,
  EDIT_CONFLICT,
  type OwnerDatabase,
  type SpaceSnapshot,
  type RecoveryPoint,
  commitChange,
} from '../indexeddb/database';
import { createInitialState } from '../prototype';
import { uid } from '../../domain/selectors';
import { parseBackup, type OwnerBackup, type BackupSpace } from './format';
export async function captureSpace(database: OwnerDatabase, id: string): Promise<SpaceSnapshot> {
  const space = await database.spaces.get(id);
  if (!space) throw new Error('空间不存在');
  const records = {} as SpaceSnapshot['records'];
  for (const table of collections)
    records[table] = await database.records(table).where('spaceId').equals(id).toArray();
  return {
    space,
    records,
    accountSnapshots: await database.accountSnapshots.where('spaceId').equals(id).toArray(),
    migrations: await database.migrations.where('spaceId').equals(id).toArray(),
    trash: await database.trash.where('spaceId').equals(id).toArray(),
  };
}
export async function exportBackup(
  database: OwnerDatabase,
  legacyRaw?: string | null,
): Promise<OwnerBackup> {
  const backup = await database.transaction('r', allTables(database), async () => {
    const spaces: BackupSpace[] = [];
    for (const space of await database.spaces.toArray())
      spaces.push({
        ...(await captureSpace(database, space.id)),
        recoveryPoints: await database.recoveryPoints.where('spaceId').equals(space.id).toArray(),
      });
    const active = await database.metadata.get('active-space');
    const legacyArchives = await database.legacyArchives.toArray();
    if (legacyRaw != null && !legacyArchives.some((archive) => archive.raw === legacyRaw))
      legacyArchives.push({ id: uid(), raw: legacyRaw, capturedAt: new Date().toISOString() });
    return {
      format: 'owner-workbench-backup',
      version: 1,
      databaseVersion: 3,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      ...(active ? { activeSpaceId: active.value } : {}),
      spaces,
      legacyArchives,
    } as OwnerBackup;
  });
  return parseBackup(JSON.stringify(backup));
}
function remapSnapshot(
  snapshot: SpaceSnapshot,
  id: string,
  mapping: Map<string, string>,
): SpaceSnapshot {
  const copy = structuredClone(snapshot);
  copy.space.id = id;
  const remapRow = (row: SpaceSnapshot['accountSnapshots'][number]) => ({
    ...row,
    spaceId: id,
    ...(row.copiedFrom
      ? {
          copiedFrom: {
            ...row.copiedFrom,
            spaceId: mapping.get(row.copiedFrom.spaceId) || row.copiedFrom.spaceId,
          },
        }
      : {}),
  });
  for (const table of collections) copy.records[table] = copy.records[table].map(remapRow);
  copy.accountSnapshots = copy.accountSnapshots.map(remapRow);
  copy.trash = copy.trash.map((entry) => ({
    ...entry,
    id: uid(),
    spaceId: id,
    rows: entry.rows.map((item) => ({ ...item, row: remapRow(item.row) })),
  }));
  copy.migrations = copy.migrations.map((migration) => ({
    ...migration,
    id: uid(),
    originalId: migration.originalId || migration.id,
    spaceId: id,
  }));
  return copy;
}
async function putSnapshot(database: OwnerDatabase, snapshot: SpaceSnapshot) {
  await database.spaces.put(snapshot.space);
  for (const table of collections) await database.records(table).bulkPut(snapshot.records[table]);
  await database.accountSnapshots.bulkPut(snapshot.accountSnapshots);
  await database.migrations.bulkPut(snapshot.migrations);
  await database.trash.bulkPut(snapshot.trash);
}
async function clearSpaceRows(database: OwnerDatabase, id: string) {
  for (const table of collections)
    await database.records(table).where('spaceId').equals(id).delete();
  await database.accountSnapshots.where('spaceId').equals(id).delete();
  await database.migrations.where('spaceId').equals(id).delete();
  await database.trash.where('spaceId').equals(id).delete();
}
async function checkpoint(
  database: OwnerDatabase,
  id: string,
  label: string,
): Promise<RecoveryPoint> {
  const point = {
    id: uid(),
    spaceId: id,
    createdAt: new Date().toISOString(),
    label,
    snapshot: await captureSpace(database, id),
  };
  await database.recoveryPoints.add(point);
  return point;
}
export async function resetDemo(database: OwnerDatabase, id: string, revision: number) {
  return database.transaction('rw', allTables(database), async () => {
    const space = await database.spaces.get(id);
    if (!space || space.revision !== revision) throw new Error(EDIT_CONFLICT);
    if (space.kind !== 'demo') throw new Error('只有示例体验空间可恢复初始示例');
    await checkpoint(database, id, '恢复初始示例前');
    return commitChange(database, id, revision, (draft) => {
      Object.assign(draft, {
        ...createInitialState(),
        habitDefinitions: undefined,
        theme: draft.theme,
      });
    });
  });
}
export async function importBackup(
  database: OwnerDatabase,
  input: OwnerBackup,
  sourceIds: string[],
  target?: { id: string; revision: number },
  beforeCommit?: () => void,
): Promise<string[]> {
  // Revalidate at the storage boundary before opening a transaction.
  const backup = await parseBackup(JSON.stringify(input));
  const selected = backup.spaces.filter((bundle) => sourceIds.includes(bundle.space.id));
  if (
    !selected.length ||
    new Set(sourceIds).size !== sourceIds.length ||
    selected.length !== sourceIds.length
  )
    throw new Error('请选择有效的备份空间');
  if (target && selected.length !== 1) throw new Error('替换时只能选择一个来源空间');
  const mapping = new Map(
    selected.map((bundle) => [bundle.space.id, target?.id || `restored-${uid()}`]),
  );
  return database.transaction('rw', allTables(database), async () => {
    for (const archive of backup.legacyArchives)
      if (
        !(await database.legacyArchives.toArray()).some((existing) => existing.raw === archive.raw)
      )
        await database.legacyArchives.add({ ...archive, id: uid() });
    for (const bundle of selected) {
      const id = mapping.get(bundle.space.id)!;
      const snapshot = remapSnapshot(bundle, id, mapping);
      if (target) {
        const current = await database.spaces.get(target.id);
        if (!current || current.revision !== target.revision) throw new Error(EDIT_CONFLICT);
        if (current.kind !== bundle.space.kind)
          throw new Error('仅能替换同类型空间，示例或原型不能覆盖正式记录');
        if (
          (await database.records('agentTasks').where('spaceId').equals(id).toArray()).some(
            (row) => row.value.status === 'running',
          )
        )
          throw new Error('请等待当前 Agent 演示任务结束后再替换');
        await checkpoint(database, id, '替换备份前');
        await clearSpaceRows(database, id);
        snapshot.space = {
          ...snapshot.space,
          name: current.name,
          createdAt: current.createdAt,
          revision: current.revision + 1,
        };
      } else {
        const label = `恢复副本 · ${bundle.space.name}`.slice(0, 170);
        const names = new Set((await database.spaces.toArray()).map((space) => space.name));
        let name = label;
        let suffix = 2;
        while (names.has(name)) name = `${label} (${suffix++})`;
        snapshot.space.name = name;
        snapshot.space.revision = 0;
      }
      for (const row of snapshot.records.agentTasks)
        if (row.value.status === 'running') row.value.status = 'interrupted';
      await putSnapshot(database, snapshot);
      for (const point of bundle.recoveryPoints)
        await database.recoveryPoints.add({
          ...point,
          id: uid(),
          spaceId: id,
          snapshot: remapSnapshot(point.snapshot, id, mapping),
        });
    }
    const ids = [...mapping.values()];
    await database.metadata.put({ key: 'active-space', value: ids[0]! });
    beforeCommit?.();
    return ids;
  });
}
export async function restoreRecoveryPoint(
  database: OwnerDatabase,
  pointId: string,
  revision: number,
  beforeCommit?: () => void,
) {
  return database.transaction('rw', allTables(database), async () => {
    const point = await database.recoveryPoints.get(pointId);
    if (!point) throw new Error('恢复点不存在');
    const current = await database.spaces.get(point.spaceId);
    if (!current || current.revision !== revision) throw new Error(EDIT_CONFLICT);
    if (point.snapshot.space.kind !== current.kind)
      throw new Error('恢复点与当前空间类型不一致，未修改记录');
    if (
      (await database.records('agentTasks').where('spaceId').equals(current.id).toArray()).some(
        (row) => row.value.status === 'running',
      )
    )
      throw new Error('请等待 Agent 演示任务结束');
    await checkpoint(database, current.id, '回退恢复点前');
    await clearSpaceRows(database, current.id);
    const snapshot = remapSnapshot(point.snapshot, current.id, new Map());
    snapshot.space = {
      ...snapshot.space,
      id: current.id,
      name: current.name,
      kind: current.kind,
      createdAt: current.createdAt,
      revision: revision + 1,
    };
    for (const row of snapshot.records.agentTasks)
      if (row.value.status === 'running') row.value.status = 'interrupted';
    await putSnapshot(database, snapshot);
    beforeCommit?.();
    return current.id;
  });
}
