import { describe, expect, it } from 'vitest';
import { createInitialState, TODAY } from '../src/data/prototype';
import { dateOffset } from '../src/domain/selectors';
import { createSummary } from '../src/features/agent/summary';

describe('local Agent summaries', () => {
  it('limits ordinary summaries to the chosen domain and declares the local demonstration', () => {
    const state = createInitialState();
    const result = createSummary(state, 'body', '帮我复盘');
    expect(result.contextName).toBe('身体状况');
    expect(result.body).toContain('身体记录');
    expect(result.body).not.toContain('当前净资产');
    expect(result.body).not.toContain('学习 / 工作');
    expect(result.body).toContain('本地演示规则，未连接 AI 模型');
    expect(result.body).toContain(`日期：${TODAY}`);
  });

  it('respects hidden balances in both the reply and the saved artifact', () => {
    const state = createInitialState();
    state.hideMoney = true;
    state.accounts = [
      { id: 'secret', name: '个人账户', amount: 9876543, type: 'cash', date: TODAY },
    ];
    const result = createSummary(state, 'overview', '复盘');
    expect(result.reply).toContain('当前已隐藏金额');
    expect(result.body).toContain('当前已隐藏金额');
    expect(result.reply + result.body).not.toMatch(/9876543|9,876,543/);
  });

  it('preserves absent sleep records and excludes out of range and future data', () => {
    const state = createInitialState();
    state.daily = [
      { date: TODAY, sleep: null, weight: null, steps: null, note: '' },
      { date: dateOffset(-1), sleep: 8, weight: null, steps: null, note: '' },
      { date: dateOffset(-7), sleep: 2, weight: null, steps: null, note: '' },
      { date: dateOffset(1), sleep: 20, weight: null, steps: null, note: '' },
    ];
    const result = createSummary(state, 'body', '复盘');
    expect(result.body).toContain('平均睡眠：8.0 小时');
    expect(result.body).toContain('有效睡眠记录：1 天');
    state.daily = [];
    expect(createSummary(state, 'body', '复盘').body).toContain('平均睡眠：未记录');
  });

  it('reports exact calendar coverage without fabricating missing meals or sleep', () => {
    const state = createInitialState();
    state.daily = [{ date: TODAY, sleep: 0, weight: null, steps: null, note: '' }];
    state.meals = [];
    const result = createSummary(state, 'overview', '查看缺少什么');
    expect(result.title).toBe('记录完整度检查');
    expect(result.body).toContain('睡眠：1/7 天有记录');
    expect(result.body).toContain('饮食：0/7 天有餐食记录');
    expect(result.body).toContain('今日餐食：0 条');
    expect(result.body).toContain(dateOffset(-6));
    expect(result.body.split('睡眠待补充日期\n')[1]).not.toContain(TODAY);
  });

  it('lists pending tasks literally and omits completed tasks', () => {
    const state = createInitialState();
    state.tasks = [
      {
        id: 'a',
        title: '<script>测试文本</script>',
        project: '个人项目',
        date: TODAY,
        done: false,
      },
      { id: 'b', title: '已经完成', project: '', date: TODAY, done: true },
    ];
    const result = createSummary(state, 'work', '整理任务');
    expect(result.title).toBe('待办整理');
    expect(result.body).toContain('1. <script>测试文本</script>（个人项目）');
    expect(result.body).not.toContain('已经完成');
    state.tasks = [];
    expect(createSummary(state, 'work', '整理待办').body).toContain('当前待办全部完成');
  });

  it('uses the selected 30 day range and reports valid focus and habit totals', () => {
    const state = createInitialState();
    state.range = 30;
    state.sessions = [{ id: 'a', date: dateOffset(-29), title: '阅读', project: '', minutes: 90 }];
    state.habits = { [TODAY]: { read: true, move: false, log: true } };
    const result = createSummary(state, 'overview', '复盘');
    expect(result.body).toContain('近 30 天');
    expect(result.body).toContain('专注投入 1.5 小时');
    expect(result.body).toContain('已完成 2/90 次');
    expect(result.body).toContain('今天完成 2/3 项');
  });
});
