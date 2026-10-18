import {
  allTables,
  EDIT_CONFLICT,
  readSpace,
  validateState,
  type OwnerDatabase,
} from '../indexeddb/database';
export async function restoreTrash(
  database: OwnerDatabase,
  entryId: string,
  expectedRevision: number,
) {
  await database.transaction('rw', allTables(database), async () => {
    const entry = await database.trash.get(entryId);
    if (!entry) throw new Error('此记录已恢复，请刷新列表');
    const current = await readSpace(database, entry.spaceId);
    if (current.space.revision !== expectedRevision) throw new Error(EDIT_CONFLICT);
    for (const { table, row } of entry.rows) {
      if (await database.records(table).get([entry.spaceId, row.id]))
        throw new Error('已有相同日期或 ID 的记录，恢复已停止；原记录与回收站保持不变');
      await database.records(table).add(row);
    }
    const restored = await readSpace(database, entry.spaceId);
    validateState(restored.state);
    if (restored.state.goals.length > 3 && restored.state.goals.length > current.state.goals.length)
      throw new Error('恢复后目标将超过 3 个，请先整理当前目标');
    await database.spaces.put({ ...current.space, revision: current.space.revision + 1 });
    await database.trash.delete(entryId);
  });
}
