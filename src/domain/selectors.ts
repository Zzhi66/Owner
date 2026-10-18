import { HABITS, type WorkbenchState } from './models';
import { addDays, completionDate, PROTOTYPE_DATE } from '../shared/date/service';

export const todayOf = (state: WorkbenchState) => state.runtime?.today ?? PROTOTYPE_DATE;
export const timezoneOf = (state: WorkbenchState) => state.runtime?.timezone ?? 'UTC';
export const completedToday = (state: WorkbenchState) =>
  state.tasks.filter(
    (task) => task.done && completionDate(task.completedAt, timezoneOf(state)) === todayOf(state),
  );
export const completedNow = (state: WorkbenchState) =>
  state.runtime?.kind === 'personal' ? new Date().toISOString() : todayOf(state);

export function dateOffset(offset: number, anchor = PROTOTYPE_DATE): string {
  return addDays(anchor, offset);
}

export function periodRecords<T extends { date: string }>(
  records: T[],
  range: number,
  anchor = PROTOTYPE_DATE,
): T[] {
  const start = dateOffset(1 - range, anchor);
  return records.filter((record) => record.date >= start && record.date <= anchor);
}

export function assets(state: WorkbenchState): { total: number; debt: number; net: number } {
  const total =
    state.accounts
      .filter((account) => account.type !== 'liability')
      .reduce((sum, account) => sum + Math.round(account.amount * 100), 0) / 100;
  const debt =
    state.accounts
      .filter((account) => account.type === 'liability')
      .reduce((sum, account) => sum + Math.round(account.amount * 100), 0) / 100;
  return { total, debt, net: (Math.round(total * 100) - Math.round(debt * 100)) / 100 };
}

export function focusHours(state: WorkbenchState, range: number): number {
  return (
    periodRecords(state.sessions, range, todayOf(state)).reduce(
      (sum, record) => sum + record.minutes,
      0,
    ) / 60
  );
}

export function habitCounts(
  state: WorkbenchState,
  range: number,
): { date: string; count: number }[] {
  return Array.from({ length: range }, (_, index) =>
    dateOffset(index + 1 - range, todayOf(state)),
  ).map((date) => ({
    date,
    count: HABITS.filter((habit) => state.habits[date]?.[habit.id]).length,
  }));
}

export function fmtMoney(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function money(state: WorkbenchState, value: number): string {
  return state.hideMoney ? '••••••' : fmtMoney(value);
}

export function uid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
