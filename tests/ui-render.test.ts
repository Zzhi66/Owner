import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TODAY, createInitialState } from '../src/data/prototype';
import type { ModuleProps, WorkbenchState } from '../src/domain/models';
import { DomainDetails } from '../src/features/details/DomainDetails';
import { TrendChart } from '../src/features/details/TrendChart';
import { Overview } from '../src/features/overview/Overview';
import { dateOffset } from '../src/domain/selectors';

function propsFor(state: WorkbenchState): ModuleProps {
  return {
    state,
    mutate: async () => true,
    open: () => {},
    navigate: () => {},
    toast: () => {},
    onAgent: () => {},
  };
}

describe('React dashboard rendering', () => {
  it('keeps assets above today actions and personal cards', () => {
    const html = renderToStaticMarkup(createElement(Overview, propsFor(createInitialState())));
    const assets = html.indexOf('id="asset-overview"');
    const todos = html.indexOf('id="today-todos-title"');
    const recent = html.indexOf('id="personal-title"');
    expect(assets).toBeGreaterThanOrEqual(0);
    expect(todos).toBeGreaterThan(assets);
    expect(recent).toBeGreaterThan(todos);
  });

  it('renders user text as escaped text instead of executable markup', () => {
    const state = createInitialState();
    state.tasks = [
      {
        id: 'unsafe-task',
        title: '<img src=x onerror="alert(1)">',
        project: '<script>alert(2)</script>',
        date: TODAY,
        done: false,
      },
    ];
    const html = renderToStaticMarkup(createElement(Overview, propsFor(state)));
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
  });

  it('excludes missing body measurements from the average and recorded-day count', () => {
    const state = createInitialState();
    state.bodyMetric = 'sleep';
    state.range = 7;
    state.daily = [
      { date: '2026-10-13', sleep: 8, weight: null, steps: null, note: '' },
      { date: TODAY, sleep: null, weight: null, steps: null, note: '' },
    ];
    const html = renderToStaticMarkup(
      createElement(DomainDetails, { ...propsFor(state), view: 'body' }),
    );
    expect(html).toContain('<strong>8.0</strong>');
    expect(html).toContain('有效记录 1/7 天');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });

  it('omits private amounts and the asset-history chart when money is hidden', () => {
    const state = createInitialState();
    state.hideMoney = true;
    state.accounts = [
      { id: 'private-account', name: '账户', type: 'cash', amount: 987654321, date: TODAY },
    ];
    state.assetHistory = [{ date: TODAY, value: 234567890 }];
    const html = renderToStaticMarkup(
      createElement(DomainDetails, { ...propsFor(state), view: 'assets' }),
    );
    expect(html).toContain('••••••');
    expect(html).toContain('金额已隐藏');
    expect(html).not.toMatch(/987654321|987,654,321|234567890|234,567,890/);
    expect(html).not.toContain('class="data-chart"');
  });

  it('plots a focus session on a date with no body record', () => {
    const state = createInitialState();
    state.daily = [];
    state.sessions = [
      {
        id: 'session-only-date',
        date: TODAY,
        title: '独立投入记录',
        project: '项目',
        minutes: 180,
      },
    ];
    const html = renderToStaticMarkup(
      createElement(DomainDetails, { ...propsFor(state), view: 'work' }),
    );
    expect(html).toContain('<strong>3.0</strong>');
    expect(html).toContain('专注投入柱状图');
    expect(html).toContain(`${TODAY}</th><td>3 小时`);
    expect(html).not.toContain('这段时间还没有记录');
  });

  it('keeps more than seven isolated observations visible in a 30-day trend without joining gaps', () => {
    const records = Array.from({ length: 30 }, (_, index) => ({
      date: dateOffset(index - 29),
      value: index < 27 && index % 3 === 0 ? 7 + index / 10 : null,
    }));
    const html = renderToStaticMarkup(
      createElement(TrendChart, { records, metric: 'sleep', unit: '小时' }),
    );
    expect(html).toContain('有效记录 9/30 天');
    expect(html).toContain('空缺日期不补零、不连线');
    expect(html.match(/<td>未记录<\/td>/gu)).toHaveLength(21);
    expect(html).toContain('2026-09-15</th><td>7 小时');
  });
});
