import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { emptyState } from '../src/data/indexeddb/database';
import {
  assetPortions,
  assetSeries,
  bodySeries,
  chartSource,
  focusProjects,
  focusSeries,
  habitSeries,
  rangeDates,
  seriesStats,
} from '../src/domain/statistics';
import { assets, focusHours } from '../src/domain/selectors';
import { AssetChart } from '../src/features/charts/AssetChart';
import { HabitChart } from '../src/features/charts/HabitChart';
import { TrendChart } from '../src/features/details/TrendChart';
import { allocationOption, habitOption, trendOption } from '../src/features/charts/options';
import { mountChart, type ChartDriver } from '../src/features/charts/lifecycle';
import { initialChunks } from '../scripts/production-audit.mjs';
import { DomainDetails } from '../src/features/details/DomainDetails';
function stateAt() {
  const state = emptyState();
  state.hideMoney = false;
  state.runtime = {
    today: '2026-01-02',
    timezone: 'Asia/Shanghai',
    spaceId: 'test',
    kind: 'personal',
  };
  return state;
}
describe('P4 统计与数据口径', () => {
  it('spans year boundaries with exactly 7/30 local calendar dates', () => {
    const state = stateAt();
    expect(rangeDates(state)).toEqual([
      '2025-12-27',
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
    state.range = 30;
    expect(rangeDates(state)).toHaveLength(30);
    expect(rangeDates(state)[0]).toBe('2025-12-04');
  });
  it('keeps absent/null body readings distinct from recorded zero', () => {
    const state = stateAt();
    state.daily = [
      { date: '2026-01-01', sleep: 0, weight: null, steps: 0, note: '' },
      { date: '2026-01-02', sleep: 8, weight: 60, steps: null, note: '' },
      { date: '2026-01-03', sleep: 24, weight: 90, steps: 999, note: '' },
    ];
    expect(bodySeries(state).map((row) => row.value)).toEqual([null, null, null, null, null, 0, 8]);
    expect(seriesStats(bodySeries(state))).toEqual({ count: 2, sum: 8, mean: 4 });
    expect(seriesStats(bodySeries(state, 'steps'))).toEqual({ count: 1, sum: 0, mean: 0 });
  });
  it('does not invent an average for empty data', () => {
    expect(seriesStats(bodySeries(stateAt()))).toEqual({ count: 0, sum: 0, mean: null });
  });
  it('focus chart/projects agree with raw minutes and selected-range summary', () => {
    const state = stateAt();
    state.sessions = [
      { id: 'a', date: '2026-01-01', title: 'A', project: '学习', minutes: 17 },
      { id: 'b', date: '2026-01-01', title: 'B', project: '学习', minutes: 13 },
      { id: 'c', date: '2026-01-02', title: 'C', project: '', minutes: 60 },
      { id: 'old', date: '2025-12-26', title: '旧', project: '旧', minutes: 600 },
      { id: 'future', date: '2026-01-03', title: '未来', project: '未来', minutes: 900 },
    ];
    expect(seriesStats(focusSeries(state))).toEqual({
      count: 2,
      sum: focusHours(state, 7),
      mean: 0.75,
    });
    expect(focusProjects(state)).toEqual([
      { name: '未分类', minutes: 60 },
      { name: '学习', minutes: 30 },
    ]);
  });
  it('counts completed tasks by local completion date, excluding old/unknown/future dates', () => {
    const state = stateAt();
    state.tasks = [
      {
        id: 'current',
        title: '当前',
        project: '',
        date: '2025-12-01',
        done: true,
        completedAt: '2026-01-01T16:30:00Z',
      },
      {
        id: 'old',
        title: '旧',
        project: '',
        date: '2026-01-02',
        done: true,
        completedAt: '2025-12-20',
      },
      { id: 'unknown', title: '未知', project: '', date: '2026-01-02', done: true },
      {
        id: 'future',
        title: '未来',
        project: '',
        date: '2026-01-03',
        done: true,
        completedAt: '2026-01-03',
      },
    ];
    const html = renderToStaticMarkup(
      createElement(DomainDetails, {
        state,
        view: 'work',
        mutate: async () => true,
        open: () => {},
        navigate: () => {},
        toast: () => {},
        onAgent: () => {},
      }),
    );
    expect(html).toContain('这段时间完成 1 项待办');
  });
  it('honors daily habit plans, false logs, missing logs and out-of-plan logs', () => {
    const state = stateAt();
    state.habitDefinitions = [
      { id: 'a', name: 'A', periods: [{ from: '2025-12-29', to: '2026-01-01' }] },
      { id: 'b', name: 'B', periods: [{ from: '2025-12-30' }] },
    ];
    state.habits = {
      '2025-12-29': { a: false },
      '2025-12-30': { a: true },
      '2026-01-01': { a: true },
      '2026-01-02': { b: true },
    };
    const rows = habitSeries(state);
    expect(rows.map((row) => row.value)).toEqual([null, null, 0, 50, null, null, 100]);
    expect(rows.map((row) => row.planned)).toEqual([0, 0, 1, 2, 2, 1, 1]);
    expect(rows[5]?.count).toBe(0);
  });
  it('asset composition uses cents, excludes debt and leaves history independent', () => {
    const state = stateAt();
    state.accounts = [
      { id: 'a', name: '现金A', type: 'cash', amount: 0.1, date: '2026-01-01' },
      { id: 'b', name: '现金B', type: 'cash', amount: 0.2, date: '2026-01-02' },
      { id: 'c', name: '投资', type: 'investment', amount: 0.7, date: '2026-01-02' },
      { id: 'd', name: '负债', type: 'liability', amount: 2, date: '2026-01-02' },
    ];
    expect(assetPortions(state)).toEqual([
      { name: '现金', value: 0.3 },
      { name: '投资', value: 0.7 },
      { name: '其他资产', value: 0 },
    ]);
    expect(assets(state)).toEqual({ total: 1, debt: 2, net: -1 });
    expect(assetSeries(state).every((row) => row.value === null)).toBe(true);
    state.assetHistory = [
      { date: '2026-01-01', value: -1 },
      { date: '2026-01-03', value: 100 },
    ];
    expect(assetSeries(state).at(-2)?.value).toBe(-1);
    expect(assetSeries(state).at(-1)?.value).toBeNull();
  });
  it.each(['personal', 'demo', 'prototype', 'legacy'] as const)(
    'labels %s without claiming sync',
    (kind) => {
      const state = stateAt();
      state.runtime!.kind = kind;
      expect(chartSource(state)).not.toMatch(/已同步|设备同步|真实 AI/u);
      expect(chartSource(state)).toContain(
        kind === 'personal' ? '正式记录' : kind === 'demo' ? '示例' : '原型',
      );
    },
  );
});
describe('P4 图表配置与回退', () => {
  it('passes all sparse observations without joining gaps or animating', () => {
    const state = stateAt();
    state.range = 30;
    const points = rangeDates(state).map((date, index) => ({
      date,
      value: index % 3 === 0 ? 7 + index / 10 : null,
    }));
    const option = trendOption(points, '睡眠', '小时');
    expect(option.animation).toBe(false);
    expect(option.series).toMatchObject([
      { connectNulls: false, showSymbol: true, data: points.map((row) => row.value) },
    ]);
    expect(option.tooltip).toMatchObject({ renderMode: 'richText', confine: true });
  });
  it('keeps heatmap zero and omits missing cells', () => {
    expect(
      habitOption([
        { date: '2026-01-01', value: null, count: 0, planned: 3 },
        { date: '2026-01-02', value: 0, count: 0, planned: 3 },
      ]).series,
    ).toMatchObject([{ data: [['2026-01-02', 0]] }]);
  });
  it('removes private amounts, chart and table when hidden', () => {
    const state = stateAt();
    state.hideMoney = true;
    state.accounts = [
      { id: 'private', name: '余额', type: 'cash', amount: 123456.78, date: '2026-01-02' },
    ];
    const html = renderToStaticMarkup(createElement(AssetChart, { state }));
    expect(html).toContain('金额已隐藏');
    expect(html).not.toMatch(/123456|123,456|echart-host|<table|100%/u);
  });
  it('shows empty states and native data tables without loading engines', () => {
    const state = stateAt();
    const html = renderToStaticMarkup(
      createElement(TrendChart, { records: bodySeries(state), metric: 'sleep', unit: '小时' }),
    );
    expect(html).toContain('这段时间还没有记录');
    expect(html).not.toContain('echart-host');
    expect(html.match(/<td>未记录<\/td>/gu)).toHaveLength(7);
    expect(html).toContain('<summary>查看睡眠数据表</summary>');
    expect(renderToStaticMarkup(createElement(HabitChart, { state }))).toContain(
      '还没有计划内打卡',
    );
    expect(renderToStaticMarkup(createElement(AssetChart, { state }))).toContain(
      '暂无可展示的正资产余额',
    );
  });
  it('never includes zero balance slices', () => {
    expect(
      allocationOption([
        { name: '现金', value: 0 },
        { name: '投资', value: 100 },
      ]).series,
    ).toMatchObject([{ data: [{ name: '投资', value: 100 }] }]);
  });
});
describe('P4 生命周期与构建', () => {
  function setup() {
    const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
    const engine: ChartDriver = { init: vi.fn(() => chart) };
    const observer = { observe: vi.fn(), disconnect: vi.fn() };
    const status = vi.fn();
    let resize = () => {};
    const observe = (fn: () => void) => {
      resize = fn;
      return observer;
    };
    return { chart, engine, observer, status, observe, resize: () => resize() };
  }
  it('resizes and releases resources exactly once', async () => {
    const test = setup();
    const stop = mountChart(
      {} as HTMLElement,
      {},
      async () => test.engine,
      test.status,
      test.observe,
    );
    await Promise.resolve();
    expect(test.status).toHaveBeenCalledWith('ready');
    test.resize();
    expect(test.chart.resize).toHaveBeenCalledOnce();
    stop();
    stop();
    test.resize();
    expect(test.chart.dispose).toHaveBeenCalledOnce();
    expect(test.observer.disconnect).toHaveBeenCalledOnce();
    expect(test.chart.resize).toHaveBeenCalledOnce();
  });
  it('ignores an import finishing after navigation', async () => {
    const test = setup();
    let resolve!: (driver: ChartDriver) => void;
    const promise = new Promise<ChartDriver>((next) => {
      resolve = next;
    });
    const stop = mountChart({} as HTMLElement, {}, () => promise, test.status, test.observe);
    stop();
    resolve(test.engine);
    await Promise.resolve();
    expect(test.engine.init).not.toHaveBeenCalled();
    expect(test.status).not.toHaveBeenCalled();
  });
  it('keeps fallback on load failure', async () => {
    const test = setup();
    const stop = mountChart(
      {} as HTMLElement,
      {},
      async () => {
        throw new Error('offline');
      },
      test.status,
      test.observe,
    );
    await Promise.resolve();
    expect(test.status).toHaveBeenCalledWith('error');
    expect(test.engine.init).not.toHaveBeenCalled();
    stop();
  });
  it('cleans up a partially initialized chart after rendering failure', async () => {
    const test = setup();
    test.chart.setOption.mockImplementation(() => {
      throw new Error('renderer');
    });
    const stop = mountChart(
      {} as HTMLElement,
      {},
      async () => test.engine,
      test.status,
      test.observe,
    );
    await Promise.resolve();
    stop();
    expect(test.status).toHaveBeenCalledWith('error');
    expect(test.chart.dispose).toHaveBeenCalledOnce();
  });
  it('follows static imports, not deferred chart modules', () => {
    expect(
      initialChunks({
        index: { isEntry: true, imports: ['react'], dynamicImports: ['engine'] },
        react: { imports: ['runtime'] },
        runtime: {},
        engine: {},
      }),
    ).toEqual(['index', 'react', 'runtime']);
    expect(() => initialChunks({})).toThrow('缺少入口');
    expect(() => initialChunks({ index: { isEntry: true, imports: ['missing'] } })).toThrow(
      '缺少依赖',
    );
  });
});
