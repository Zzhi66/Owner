import type { WorkbenchState } from './models';
import { dateOffset, habitCounts, periodRecords, todayOf } from './selectors';
import { activeHabits } from './habits';

export interface ChartPoint {
  date: string;
  value: number | null;
}
export const bodyLabels = {
  sleep: { label: '睡眠', unit: '小时' },
  weight: { label: '体重', unit: 'kg' },
  steps: { label: '活动量', unit: '步' },
};
export const accountLabels = {
  cash: '现金',
  investment: '投资',
  other: '其他资产',
  liability: '负债',
};

export function rangeDates(state: WorkbenchState, range = state.range) {
  return Array.from({ length: range }, (_, index) => dateOffset(index + 1 - range, todayOf(state)));
}
export function bodySeries(
  state: WorkbenchState,
  metric = state.bodyMetric,
  range = state.range,
): ChartPoint[] {
  return rangeDates(state, range).map((date) => ({
    date,
    value: state.daily.find((entry) => entry.date === date)?.[metric] ?? null,
  }));
}
export function focusSeries(state: WorkbenchState): ChartPoint[] {
  return rangeDates(state).map((date) => {
    const entries = state.sessions.filter((session) => session.date === date);
    return {
      date,
      value: entries.length ? entries.reduce((sum, entry) => sum + entry.minutes, 0) / 60 : null,
    };
  });
}
export function seriesStats(points: ChartPoint[]) {
  const values = points.flatMap(({ value }) =>
    value !== null && Number.isFinite(value) ? [value] : [],
  );
  const sum = values.reduce((total, value) => total + value, 0);
  return { count: values.length, sum, mean: values.length ? sum / values.length : null };
}
export function focusProjects(state: WorkbenchState) {
  const projects = new Map<string, number>();
  for (const session of periodRecords(state.sessions, state.range, todayOf(state))) {
    const name = session.project.trim() || '未分类';
    projects.set(name, (projects.get(name) ?? 0) + session.minutes);
  }
  return [...projects]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}
export function habitSeries(state: WorkbenchState) {
  return habitCounts(state, state.range).map((entry) => {
    const recorded = activeHabits(state, entry.date).some((habit) =>
      Object.hasOwn(state.habits[entry.date] ?? {}, habit.id),
    );
    return {
      ...entry,
      value: entry.planned && recorded ? (entry.count / entry.planned) * 100 : null,
    };
  });
}
export function assetPortions(state: WorkbenchState) {
  return (['cash', 'investment', 'other'] as const).map((type) => ({
    name: accountLabels[type],
    value:
      state.accounts
        .filter((account) => account.type === type)
        .reduce((sum, account) => sum + Math.round(account.amount * 100), 0) / 100,
  }));
}
export function assetSeries(state: WorkbenchState): ChartPoint[] {
  return rangeDates(state).map((date) => ({
    date,
    value: state.assetHistory.find((entry) => entry.date === date)?.value ?? null,
  }));
}
export function chartSource(state: WorkbenchState) {
  const kind = state.runtime?.kind;
  return kind === 'personal'
    ? '正式记录 · 当前空间保存的记录'
    : kind === 'demo'
      ? '示例体验 · 固定示例数据'
      : '原型记录 · 保留旧日期与来源';
}
