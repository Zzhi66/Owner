import type { RecordKind, WorkbenchState } from './models';
export function removeRecord(
  state: WorkbenchState,
  kind: RecordKind,
  id: string | undefined,
  date: string,
  habitId = '',
) {
  if (kind === 'body') state.daily = state.daily.filter((row) => row.date !== date);
  else if (kind === 'wellbeing') delete state.wellbeing[date];
  else if (kind === 'habits') {
    delete state.habits[date]?.[habitId];
    if (state.habits[date] && !Object.keys(state.habits[date]!).length) delete state.habits[date];
  } else {
    const key = {
      diet: 'meals',
      work: 'sessions',
      assets: 'accounts',
      event: 'events',
      goal: 'goals',
      task: 'tasks',
      note: 'notes',
    }[kind] as 'meals' | 'sessions' | 'accounts' | 'events' | 'goals' | 'tasks' | 'notes';
    state[key] = state[key].filter((row) => row.id !== id) as never;
    if (kind === 'goal')
      state.tasks.forEach((task) => {
        if (task.goalId === id) delete task.goalId;
      });
  }
}
