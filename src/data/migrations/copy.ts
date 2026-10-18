import {
  allTables,
  commitChange,
  EDIT_CONFLICT,
  readSpace,
  type Collection,
  type OwnerDatabase,
  type Row,
} from '../indexeddb/database';
import { uid } from '../../domain/selectors';
import { validCalendarDate } from '../../shared/date/service';
export type CopyDomain = 'body' | 'habits' | 'diet' | 'work' | 'assets' | 'calendar';
export interface CopySelection {
  domain: CopyDomain;
  from: string;
  to: string;
  includeUnknown: boolean;
}
const domainTables: Record<CopyDomain, Collection[]> = {
  body: ['daily', 'wellbeing'],
  habits: ['habitLogs'],
  diet: ['meals'],
  work: ['sessions', 'tasks', 'goals'],
  assets: ['accounts'],
  calendar: ['events'],
};
interface Candidate {
  table: Collection;
  row: Row;
}
export interface CopyPreview {
  sourceRevision: number;
  targetRevision: number;
  candidates: Candidate[];
  skipped: number;
  conflicts: string[];
  goalMappings: Record<string, string>;
}
export async function previewCopy(
  database: OwnerDatabase,
  sourceId: string,
  selection: CopySelection,
): Promise<CopyPreview> {
  if (
    !validCalendarDate(selection.from) ||
    !validCalendarDate(selection.to) ||
    selection.from > selection.to
  )
    throw new Error('请选择有效的起止日期');
  return database.transaction('r', allTables(database), async () => {
    const source = await database.spaces.get(sourceId);
    const target = await readSpace(database, 'personal');
    if (source?.kind !== 'prototype') throw new Error('请先将旧记录复制到原型空间');
    const candidates: Candidate[] = [];
    let skipped = 0;
    const conflicts: string[] = [];
    const goalMappings = Object.fromEntries(
      (await database.records('goals').where('spaceId').equals('personal').toArray())
        .filter((row) => row.copiedFrom?.spaceId === sourceId)
        .map((row) => [row.copiedFrom!.id, row.id]),
    );
    for (const table of domainTables[selection.domain]) {
      const old = await database.records(table).where('spaceId').equals(sourceId).toArray();
      const existing = await database.records(table).where('spaceId').equals('personal').toArray();
      for (const row of old) {
        if (row.date < selection.from || row.date > selection.to) continue;
        if (
          (!selection.includeUnknown && row.source === '未知') ||
          existing.some(
            (item) => item.copiedFrom?.spaceId === sourceId && item.copiedFrom.id === row.id,
          )
        ) {
          skipped++;
          continue;
        }
        candidates.push({ table, row });
      }
    }
    // Related goals travel with selected tasks, even when their due date is outside the filter.
    for (const item of [...candidates]) {
      if (item.table === 'habitLogs') {
        const habitId = String(item.row.value.habitId);
        if (
          !(await database.records('habitDefinitions').get(['personal', habitId])) &&
          !candidates.some(
            (other) => other.table === 'habitDefinitions' && other.row.id === habitId,
          )
        ) {
          const definition = await database.records('habitDefinitions').get([sourceId, habitId]);
          if (definition && (selection.includeUnknown || definition.source !== '未知'))
            candidates.push({ table: 'habitDefinitions', row: definition });
          else conflicts.push('关联习惯配置缺失或来源不明，请先在原型空间核对或允许未知来源');
        }
      }
      if (item.table !== 'tasks' || !item.row.value.goalId) continue;
      const goalId = String(item.row.value.goalId);
      if (goalMappings[goalId]) continue;
      if (candidates.some((other) => other.table === 'goals' && other.row.id === goalId)) continue;
      const row = await database.records('goals').get([sourceId, goalId]);
      if (row && (selection.includeUnknown || row.source !== '未知'))
        candidates.push({ table: 'goals', row });
      else
        conflicts.push(
          `待办「${item.row.value.title}」关联的目标来源不明，请核对后允许包含未知来源`,
        );
    }
    for (const { table, row } of candidates) {
      if (
        (table === 'daily' && target.state.daily.some((item) => item.date === row.date)) ||
        (table === 'wellbeing' && target.state.wellbeing[row.date]) ||
        (table === 'habitLogs' &&
          target.state.habits[row.date]?.[String(row.value.habitId)] !== undefined)
      )
        conflicts.push(`${row.date} 已有同类正式记录`);
      if (
        table === 'accounts' &&
        target.state.accounts.some(
          (item) => item.name === row.value.name && item.type === row.value.type,
        )
      )
        conflicts.push(`正式空间已有同名同类账户「${row.value.name}」`);
      if (
        table === 'accounts' &&
        candidates.filter(
          (item) =>
            item.table === 'accounts' &&
            item.row.value.name === row.value.name &&
            item.row.value.type === row.value.type,
        ).length > 1
      )
        conflicts.push(`所选原型账户存在同名同类项「${row.value.name}」，请先在原型空间核对`);
    }
    if (candidates.filter((item) => item.table === 'goals').length + target.state.goals.length > 3)
      conflicts.push('复制后目标将超过 3 个，请先整理正式空间的目标');
    return {
      sourceRevision: source.revision,
      targetRevision: target.space.revision,
      candidates,
      skipped,
      conflicts: [...new Set(conflicts)],
      goalMappings,
    };
  });
}
export async function copyToPersonal(
  database: OwnerDatabase,
  sourceId: string,
  selection: CopySelection,
  expected: Pick<CopyPreview, 'sourceRevision' | 'targetRevision'>,
) {
  return database.transaction('rw', allTables(database), async () => {
    const preview = await previewCopy(database, sourceId, selection);
    if (
      preview.sourceRevision !== expected.sourceRevision ||
      preview.targetRevision !== expected.targetRevision
    )
      throw new Error(EDIT_CONFLICT);
    if (preview.conflicts.length) throw new Error(preview.conflicts.join('；'));
    const idMap = new Map(
      preview.candidates.map(({ table, row }) => [`${table}:${row.id}`, uid()]),
    );
    const destination = (table: Collection, row: Row) =>
      ['daily', 'wellbeing', 'habitLogs', 'habitDefinitions'].includes(table)
        ? row.id
        : idMap.get(`${table}:${row.id}`)!;
    await commitChange(database, 'personal', preview.targetRevision, (draft) => {
      for (const { table, row } of preview.candidates) {
        const value = { ...row.value };
        if (table === 'daily') draft.daily.push(value as never);
        else if (table === 'wellbeing') draft.wellbeing[row.date] = value as never;
        else if (table === 'habitLogs') {
          draft.habits[row.date] ??= {};
          draft.habits[row.date]![String(value.habitId)] = Boolean(value.done);
        } else {
          value.id = destination(table, row);
          if (table === 'tasks' && value.goalId)
            value.goalId =
              idMap.get(`goals:${value.goalId}`) || preview.goalMappings[String(value.goalId)];
          if (table === 'accounts') {
            value.amount = Number(value.amountMinor) / 100;
            delete value.amountMinor;
            delete value.currency;
          }
          (draft[table] as unknown[]).push(value);
        }
      }
    });
    for (const { table, row } of preview.candidates) {
      const key: [string, string] = ['personal', destination(table, row)];
      const saved = await database.records(table).get(key);
      if (saved)
        await database.records(table).put({
          ...saved,
          source: row.source,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          migratedAt: new Date().toISOString(),
          copiedFrom: { spaceId: sourceId, id: row.id },
        });
      if (table === 'accounts') {
        const snapshots = await database.accountSnapshots
          .where('spaceId')
          .equals('personal')
          .toArray();
        for (const snapshot of snapshots.filter((item) => item.value.accountId === key[1])) {
          await database.accountSnapshots.put({
            ...snapshot,
            source: row.source,
            copiedFrom: { spaceId: sourceId, id: row.id },
          });
        }
      }
    }
    return preview.candidates.length;
  });
}
