import { loadPrototype } from '../prototype';
import { validateState } from '../indexeddb/database';
import type { WorkbenchState } from '../../domain/models';
export interface LegacyReport {
  raw: string | null | undefined;
  state: WorkbenchState | null;
  count: number;
  unknown: number;
  first: string;
  last: string;
  error: string | null;
}
export function inspectLegacy(raw: string | null | undefined): LegacyReport {
  const report: LegacyReport = {
    raw,
    state: null,
    count: 0,
    unknown: 0,
    first: '',
    last: '',
    error: null,
  };
  if (raw === null) return report;
  if (raw === undefined) return { ...report, error: '旧存储读取失败，请检查浏览器权限后重试。' };
  const loaded = loadPrototype({ getItem: () => raw, setItem: () => {} });
  if (!loaded.canSave) return { ...report, error: loaded.warning };
  try {
    validateState(loaded.state);
    const state = loaded.state;
    const records = [
      ...state.daily,
      ...state.meals,
      ...state.sessions,
      ...state.accounts,
      ...state.assetHistory,
      ...state.tasks,
      ...state.events,
      ...state.goals,
      ...state.notes,
      ...state.messages,
      ...state.agentTasks,
      ...state.artifacts,
      ...Object.entries(state.wellbeing).map(([date, value]) => ({ ...value, date })),
      ...Object.entries(state.habits).flatMap(([date, logs]) =>
        Object.entries(logs).map(([habit, done]) => ({ date, habit, done })),
      ),
    ];
    const dates = records
      .flatMap((record) =>
        'date' in record && typeof record.date === 'string' ? [record.date] : [],
      )
      .sort();
    return {
      ...report,
      state,
      count: records.length,
      unknown: records.filter(
        (record) =>
          !('source' in record) || typeof record.source !== 'string' || !record.source.trim(),
      ).length,
      first: dates[0] || '',
      last: dates.at(-1) || '',
    };
  } catch (error) {
    return {
      ...report,
      error: error instanceof Error ? error.message : '旧数据校验失败，原始内容保留。',
    };
  }
}
