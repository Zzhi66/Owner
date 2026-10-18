import type { WorkbenchState } from './models';

export type RecordEditTarget =
  | { kind: 'body' | 'wellbeing'; date: string }
  | { kind: 'event' | 'goal' | 'task' | 'note'; id?: string }
  | { kind: 'assets'; id?: string; name: string; type: string }
  | { kind: 'habits'; date: string; habit: string }
  | { kind: 'diet' | 'work'; id?: string };

export type RecordEditBaseline = Pick<
  WorkbenchState,
  | 'daily'
  | 'wellbeing'
  | 'events'
  | 'goals'
  | 'accounts'
  | 'habits'
  | 'meals'
  | 'sessions'
  | 'tasks'
  | 'notes'
>;

export const RECORD_EDIT_CONFLICT =
  '这条记录已在其他页面修改或删除，草稿已保留。请关闭窗口后重新打开核对。';

/** Freeze the records represented by an editor, independently of future storage events. */
export function captureRecordEditBaseline(state: WorkbenchState): RecordEditBaseline {
  return structuredClone({
    daily: state.daily,
    wellbeing: state.wellbeing,
    events: state.events,
    goals: state.goals,
    accounts: state.accounts,
    habits: state.habits,
    meals: state.meals,
    sessions: state.sessions,
    tasks: state.tasks,
    notes: state.notes,
  });
}

function targetValue(state: RecordEditBaseline, target: RecordEditTarget): unknown {
  switch (target.kind) {
    case 'body':
      return state.daily.filter((record) => record.date === target.date);
    case 'wellbeing':
      return state.wellbeing[target.date];
    case 'event':
      return target.id ? state.events.filter((record) => record.id === target.id) : null;
    case 'goal':
      return target.id ? state.goals.filter((record) => record.id === target.id) : null;
    case 'assets':
      return state.accounts.filter((record) =>
        target.id
          ? record.id === target.id
          : record.name === target.name && record.type === target.type,
      );
    case 'habits':
      return state.habits[target.date]?.[target.habit];
    case 'diet':
      return target.id ? state.meals.filter((record) => record.id === target.id) : null;
    case 'work':
      return target.id ? state.sessions.filter((record) => record.id === target.id) : null;
    case 'task':
      return target.id ? state.tasks.filter((record) => record.id === target.id) : null;
    case 'note':
      return target.id ? state.notes.filter((record) => record.id === target.id) : null;
  }
}

function signature(value: unknown): string | undefined {
  return JSON.stringify(value, (_, item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
  });
}

export function matchesRecordEditBaseline(
  baseline: RecordEditBaseline,
  current: WorkbenchState,
  target: RecordEditTarget,
): boolean {
  if ('id' in target && target.id) {
    const tables = {
      diet: 'meals',
      work: 'sessions',
      assets: 'accounts',
      event: 'events',
      goal: 'goals',
      task: 'tasks',
      note: 'notes',
    } as const;
    if (!current[tables[target.kind]].some((record) => record.id === target.id)) return false;
  }
  if (
    target.kind === 'event' &&
    target.id &&
    !current.events.some((record) => record.id === target.id)
  )
    return false;
  if (
    target.kind === 'goal' &&
    target.id &&
    !current.goals.some((record) => record.id === target.id)
  )
    return false;
  return signature(targetValue(baseline, target)) === signature(targetValue(current, target));
}

export function assertRecordEditBaseline(
  baseline: RecordEditBaseline,
  current: WorkbenchState,
  target: RecordEditTarget,
): void {
  if (!matchesRecordEditBaseline(baseline, current, target)) throw new Error(RECORD_EDIT_CONFLICT);
}
