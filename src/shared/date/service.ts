export const PROTOTYPE_DATE = '2026-10-14';
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };
export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Calendar arithmetic, independent of the duration of a local DST day. */
export function addDays(date: string, offset: number): string {
  if (!validCalendarDate(date) || !Number.isInteger(offset)) throw new Error('无效的日历日期');
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
}
export function calendarDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function createDateService(clock: Clock = systemClock, timezone = deviceTimezone()) {
  return {
    timezone,
    today: () => calendarDate(clock.now(), timezone),
    now: () => clock.now().toISOString(),
  };
}
export function completionDate(completedAt: string | undefined, timezone: string): string | null {
  if (!completedAt) return null;
  if (validCalendarDate(completedAt)) return completedAt;
  const instant = new Date(completedAt);
  return Number.isFinite(instant.getTime()) ? calendarDate(instant, timezone) : null;
}
