import type { EChartsCoreOption } from 'echarts/core';
import type { ChartPoint } from '../../domain/statistics';

// HUD chart tokens, shared by axes, data marks and text. Charts do not animate.
const ink = '#e2f2fc';
const muted = '#9ab3c5';
const border = '#244456';
export const chartColors = ['#5be1ef', '#eec479', '#b4a4ff'];
const tooltip = {
  renderMode: 'richText' as const,
  confine: true,
  backgroundColor: '#0d1e2e',
  borderColor: border,
  textStyle: { color: ink, fontSize: 13 },
};
const base = {
  animation: false,
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', color: muted, fontSize: 12 },
};
const number = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const itemOf = (params: unknown): Record<string, unknown> => {
  const item: unknown = Array.isArray(params) ? params[0] : params;
  return typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
};

export function trendOption(
  records: ChartPoint[],
  label: string,
  unit: string,
  bars = false,
): EChartsCoreOption {
  return {
    ...base,
    aria: { enabled: false },
    grid: { left: 12, right: 18, top: 32, bottom: 12, containLabel: true },
    tooltip: {
      ...tooltip,
      trigger: 'axis',
      formatter: (params: unknown) => {
        const item = itemOf(params);
        return `${String(item.name ?? '')}\n${label}：${typeof item.value === 'number' ? `${number(item.value)} ${unit}` : '未记录'}`;
      },
    },
    xAxis: {
      type: 'category',
      data: records.map((entry) => entry.date),
      boundaryGap: bars,
      axisLabel: {
        color: muted,
        hideOverlap: true,
        fontSize: 12,
        formatter: (value: string) => value.slice(5).replace('-', '/'),
      },
      axisLine: { lineStyle: { color: border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: unit,
      scale: !bars,
      min: bars ? 0 : undefined,
      nameTextStyle: { color: muted },
      axisLabel: { color: muted, fontSize: 12, formatter: (value: number) => number(value) },
      splitLine: { lineStyle: { color: border, type: 'dashed' } },
    },
    series: [
      {
        name: label,
        type: bars ? 'bar' : 'line',
        data: records.map(({ value }) => value),
        connectNulls: false,
        showSymbol: true,
        symbolSize: 7,
        barMaxWidth: 24,
        itemStyle: { color: chartColors[0], borderRadius: bars ? [3, 3, 0, 0] : undefined },
        lineStyle: { color: chartColors[0], width: 2 },
        emphasis: { disabled: true },
      },
    ],
  };
}
export function habitOption(
  records: (ChartPoint & { count: number; planned: number })[],
): EChartsCoreOption {
  return {
    ...base,
    tooltip: {
      ...tooltip,
      formatter: (params: unknown) => {
        const data: unknown = itemOf(params).data;
        if (!Array.isArray(data)) return '';
        const entry = records.find((row) => row.date === data[0]);
        return entry
          ? `${entry.date}\n已完成 ${entry.count}/${entry.planned} 次 · ${number(entry.value ?? 0)}%`
          : '';
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      inRange: { color: ['#294c60', '#327d8c', '#5be1ef'] },
    },
    calendar: {
      top: 28,
      left: 'center',
      cellSize: [36, 26],
      range: [records[0]?.date ?? '', records.at(-1)?.date ?? ''],
      splitLine: { show: false },
      yearLabel: { show: false },
      monthLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: ['日', '一', '二', '三', '四', '五', '六'],
        color: muted,
        fontSize: 12,
      },
      itemStyle: { color: '#0b1927', borderColor: border, borderWidth: 2 },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        label: {
          show: true,
          color: ink,
          backgroundColor: '#0b1927',
          padding: [0, 2],
          borderRadius: 2,
          fontSize: 12,
          formatter: (params: unknown) => {
            const data: unknown = itemOf(params).data;
            return Array.isArray(data) ? String(data[0]).slice(8) : '';
          },
        },
        data: records.filter((row) => row.value !== null).map((row) => [row.date, row.value]),
        itemStyle: { borderColor: '#0b1927', borderWidth: 3 },
        emphasis: { disabled: true },
      },
    ],
  };
}
export function allocationOption(portions: { name: string; value: number }[]): EChartsCoreOption {
  return {
    ...base,
    color: chartColors,
    tooltip: {
      ...tooltip,
      formatter: (params: unknown) => {
        const item = itemOf(params);
        return `${String(item.name ?? '')}\n${typeof item.value === 'number' ? `${number(item.value)} 元` : ''} · ${String(item.percent ?? 0)}%`;
      },
    },
    series: [
      {
        name: '资产构成',
        type: 'pie',
        radius: ['54%', '78%'],
        center: ['50%', '50%'],
        label: { show: false },
        labelLine: { show: false },
        silent: false,
        itemStyle: { borderColor: '#0b1927', borderWidth: 3 },
        data: portions.filter((row) => row.value > 0),
        emphasis: { scale: false },
      },
    ],
  };
}
