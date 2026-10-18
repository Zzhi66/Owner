import { todayOf } from '../../domain/selectors';
import { DOMAINS, HABITS, type View, type WorkbenchState } from '../../domain/models';
import {
  assets,
  dateOffset as offsetFrom,
  focusHours,
  fmtMoney,
  habitCounts,
  periodRecords,
} from '../../domain/selectors';

export interface AgentSummary {
  title: string;
  body: string;
  contextName: string;
  reply: string;
}

export function contextName(context: View): string {
  return context === 'overview'
    ? '个人总览'
    : (DOMAINS.find((domain) => domain.id === context)?.name ?? '个人总览');
}

/** Deterministic local demonstration; this function never calls a model or external service. */
export function createSummary(state: WorkbenchState, context: View, prompt: string): AgentSummary {
  const TODAY = todayOf(state);
  const dateOffset = (offset: number) => offsetFrom(offset, TODAY);
  const daily = periodRecords(state.daily, state.range, TODAY);
  const sleepRecords = daily.filter(
    (record): record is typeof record & { sleep: number } =>
      record.sleep != null && Number.isFinite(record.sleep),
  );
  const mean = sleepRecords.length
    ? sleepRecords.reduce((sum, record) => sum + record.sleep, 0) / sleepRecords.length
    : null;
  const balance = assets(state);
  const habits = habitCounts(state, state.range).reduce((sum, record) => sum + record.count, 0);
  const mealDays = new Set(periodRecords(state.meals, state.range, TODAY).map((meal) => meal.date))
    .size;
  const pending = state.tasks.filter((task) => !task.done);
  const isTasks = /待办|任务/.test(prompt);
  const isMissing = /缺|空/.test(prompt);
  const title = isTasks ? '待办整理' : isMissing ? '记录完整度检查' : '个人近况复盘';
  const sections: string[] = [];

  if (isTasks) {
    sections.push(
      '待处理事项\n' +
        (pending.length
          ? pending
              .map(
                (task, index) =>
                  `${index + 1}. ${task.title}${task.project ? `（${task.project}）` : ''}`,
              )
              .join('\n')
          : '当前待办全部完成。'),
    );
  } else if (isMissing) {
    const recordedDates = new Set(sleepRecords.map((record) => record.date));
    const missingSleep = Array.from({ length: state.range }, (_, index) =>
      dateOffset(index + 1 - state.range),
    ).filter((date) => !recordedDates.has(date));
    sections.push(
      `记录覆盖\n睡眠：${state.range - missingSleep.length}/${state.range} 天有记录。\n饮食：${mealDays}/${state.range} 天有餐食记录。\n今日餐食：${state.meals.filter((meal) => meal.date === TODAY).length} 条。\n缺失日期或餐食继续保留为空缺。`,
    );
    if (missingSleep.length) sections.push('睡眠待补充日期\n' + missingSleep.join('、'));
  } else {
    if (context === 'overview' || context === 'body') {
      sections.push(
        `身体记录\n近 ${state.range} 天平均睡眠：${mean == null ? '未记录' : mean.toFixed(1) + ' 小时'}。\n有效睡眠记录：${sleepRecords.length} 天。\n以上仅为原始记录的汇总。`,
      );
    }
    if (context === 'overview' || context === 'habits') {
      sections.push(
        `习惯\n已完成 ${habits}/${state.range * HABITS.length} 次自设计划。\n今天完成 ${HABITS.filter((habit) => state.habits[TODAY]?.[habit.id]).length}/${HABITS.length} 项。`,
      );
    }
    if (context === 'overview' || context === 'diet') {
      sections.push(
        `饮食\n近 ${state.range} 天中，${mealDays} 天有餐食记录。\n营养数值保留为录入的估算值，份量未知时继续标记待补充。`,
      );
    }
    if (context === 'overview' || context === 'work') {
      sections.push(
        `学习 / 工作\n记录专注投入 ${focusHours(state, state.range).toFixed(1)} 小时。\n完成任务 ${state.tasks.filter((task) => task.done).length}/${state.tasks.length} 项，还有 ${pending.length} 项待处理。`,
      );
    }
    if (context === 'overview' || context === 'assets') {
      sections.push(
        state.hideMoney
          ? '资产\n当前已隐藏金额。可在资产卡片恢复显示。'
          : `资产\n总资产 ${fmtMoney(balance.total)}，负债 ${fmtMoney(balance.debt)}。\n当前净资产 ${fmtMoney(balance.net)}，估值时间见各账户记录。`,
      );
    }
  }

  const name = contextName(context);
  const body =
    `# ${title}\n\n日期：${TODAY}\n上下文：${name} · 近 ${state.range} 天\n来源：当前${state.runtime?.kind === 'personal' ? '正式记录' : state.runtime?.kind === 'demo' ? '示例体验' : '原型记录'}空间\n生成方式：本地演示规则，未连接 AI 模型\n\n` +
    sections.join('\n\n');
  return {
    title,
    body,
    contextName: name,
    reply: `已基于「${name}」整理了近 ${state.range} 天的记录。\n\n${sections.join('\n\n')}\n\n整理结果已保存到「产物」，可以查看和导出。`,
  };
}
