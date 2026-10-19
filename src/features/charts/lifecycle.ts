import type { EChartsCoreOption } from 'echarts/core';

export interface ChartInstance {
  setOption(option: EChartsCoreOption): void;
  resize(): void;
  dispose(): void;
}
export interface ChartDriver {
  init(host: HTMLElement, theme: null, options: { renderer: 'svg' }): ChartInstance;
}
export interface ChartObserver {
  observe(host: HTMLElement): void;
  disconnect(): void;
}
/** Import may finish after navigation. Every created observer/instance has one owner. */
export function mountChart(
  host: HTMLElement,
  option: EChartsCoreOption,
  load: () => Promise<ChartDriver>,
  status: (value: 'ready' | 'error') => void,
  observe: (resize: () => void) => ChartObserver = (resize) => new ResizeObserver(resize),
) {
  let cancelled = false;
  let chart: ChartInstance | undefined;
  let observer: ChartObserver | undefined;
  const dispose = () => {
    observer?.disconnect();
    observer = undefined;
    chart?.dispose();
    chart = undefined;
  };
  void load().then(
    (driver) => {
      if (cancelled) return;
      try {
        chart = driver.init(host, null, { renderer: 'svg' });
        chart.setOption(option);
        observer = observe(() => chart?.resize());
        observer.observe(host);
        status('ready');
      } catch {
        dispose();
        status('error');
      }
    },
    () => {
      if (!cancelled) status('error');
    },
  );
  return () => {
    cancelled = true;
    dispose();
  };
}
