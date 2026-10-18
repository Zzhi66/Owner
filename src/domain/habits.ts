import { HABITS, type HabitDefinition, type WorkbenchState } from './models';
export const defaultHabits = (): HabitDefinition[] =>
  HABITS.map((habit) => ({ ...habit, periods: [{ from: '0001-01-01' }] }));
export const definitionsOf = (state: WorkbenchState) => state.habitDefinitions ?? defaultHabits();
export const activeHabits = (state: WorkbenchState, date: string) =>
  definitionsOf(state).filter((habit) =>
    habit.periods.some((period) => period.from <= date && (!period.to || date < period.to)),
  );
export function setHabitActive(state: WorkbenchState, id: string, date: string, enabled: boolean) {
  state.habitDefinitions ??= defaultHabits();
  const habit = state.habitDefinitions.find((item) => item.id === id);
  if (!habit) throw new Error('习惯已被其他页面修改，请重新打开');
  const isActive = activeHabits(state, date).some((item) => item.id === id);
  if (isActive === enabled) return;
  if (enabled) habit.periods.push({ from: date });
  else for (const period of habit.periods) if (!period.to && period.from <= date) period.to = date;
}
