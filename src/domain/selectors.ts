import { HABITS, type WorkbenchState } from './models';

/** P1 retains the prototype's explicit calendar anchor; real dates follow in P2. */
const PROTOTYPE_TODAY = '2026-10-14';

export function dateOffset(offset: number): string {
  const date = new Date(`${PROTOTYPE_TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function periodRecords<T extends { date: string }>(records: T[], range: number): T[] {
  const start = dateOffset(1 - range);
  return records.filter((record) => record.date >= start && record.date <= PROTOTYPE_TODAY);
}

export function assets(state: WorkbenchState): { total: number; debt: number; net: number } {
  const total = state.accounts
    .filter((account) => account.type !== 'liability')
    .reduce((sum, account) => sum + account.amount, 0);
  const debt = state.accounts
    .filter((account) => account.type === 'liability')
    .reduce((sum, account) => sum + account.amount, 0);
  return { total, debt, net: total - debt };
}

export function focusHours(state: WorkbenchState, range: number): number {
  return periodRecords(state.sessions, range).reduce((sum, record) => sum + record.minutes, 0) / 60;
}

export function habitCounts(
  state: WorkbenchState,
  range: number,
): { date: string; count: number }[] {
  return Array.from({ length: range }, (_, index) => dateOffset(index + 1 - range)).map((date) => ({
    date,
    count: HABITS.filter((habit) => state.habits[date]?.[habit.id]).length,
  }));
}

export function fmtMoney(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

export function money(state: WorkbenchState, value: number): string {
  return state.hideMoney ? '••••••' : fmtMoney(value);
}

export function uid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
