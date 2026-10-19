import { useEffect, useRef, useState } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { mountChart } from './lifecycle';

const loaders = {
  trend: () => import('./trend-engine'),
  habits: () => import('./habit-engine'),
  assets: () => import('./asset-engine'),
};
export function ChartCanvas({
  option,
  kind,
  label,
  height = 240,
}: {
  option: EChartsCoreOption;
  kind: keyof typeof loaders;
  label: string;
  height?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    return mountChart(host.current, option, loaders[kind], setStatus);
  }, [option, kind, attempt]);
  return (
    <div className="chart-canvas" style={{ minHeight: height }}>
      <div ref={host} className="echart-host" role="img" aria-label={label} style={{ height }} />
      {status !== 'ready' && (
        <div className="chart-status" role="status">
          {status === 'error' ? (
            <>
              图表暂时无法显示，下方数据表仍可查看。
              <button
                className="text-button"
                onClick={() => {
                  setStatus('loading');
                  setAttempt((value) => value + 1);
                }}
              >
                重试图表
              </button>
            </>
          ) : (
            '正在绘制本地统计…'
          )}
        </div>
      )}
    </div>
  );
}
