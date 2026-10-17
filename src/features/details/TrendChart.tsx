import { useEffect, useRef, useState } from 'react';

export interface ChartPoint {
  date: string;
  value: number | null;
}

export function TrendChart({
  records,
  metric,
  unit,
  bars = false,
}: {
  records: ChartPoint[];
  metric: string;
  unit: string;
  bars?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(180, entry.contentRect.width));
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const values = records.flatMap((record) =>
    record.value === null || !Number.isFinite(record.value) ? [] : [record.value],
  );
  const height = 154;
  const left = metric === 'value' ? 58 : 35;
  const right = 12;
  const top = 17;
  const bottom = 28;
  const actualMin = values.length ? Math.min(...values) : 0;
  const actualMax = values.length ? Math.max(...values) : 0;
  const span = Math.max(
    actualMax - actualMin,
    metric === 'weight' ? 1 : metric === 'steps' ? 1000 : 1,
  );
  const low = bars
    ? Math.min(0, actualMin)
    : metric === 'value'
      ? actualMin - span * 0.3
      : Math.max(0, actualMin - span * 0.3);
  const high = actualMax + span * 0.35;
  const plotWidth = width - left - right;
  const x = (index: number) =>
    left + 6 + (index * (plotWidth - 12)) / Math.max(1, records.length - 1);
  const y = (value: number) => top + ((high - value) / (high - low || 1)) * (height - top - bottom);
  const tickLabel = (value: number) =>
    metric === 'steps' || metric === 'value'
      ? Math.round(value).toLocaleString('zh-CN')
      : value.toFixed(1);
  const ticks = new Set([
    0,
    Math.round((records.length - 1) / 3),
    Math.round(((records.length - 1) * 2) / 3),
    records.length - 1,
  ]);
  const path = records
    .map((record, index) => {
      if (record.value === null || !Number.isFinite(record.value)) {
        return '';
      }
      const previous = records[index - 1]?.value;
      const connected = previous !== undefined && previous !== null && Number.isFinite(previous);
      const point = `${connected ? 'L' : 'M'}${x(index).toFixed(1)},${y(record.value).toFixed(1)}`;
      return point;
    })
    .join(' ');
  // An isolated observation has no line segment, so it always needs a visible point.
  const isIsolatedPoint = (index: number) =>
    !Number.isFinite(records[index - 1]?.value) && !Number.isFinite(records[index + 1]?.value);
  const barWidth = Math.max(3, Math.min(16, (plotWidth / records.length) * 0.55));
  return (
    <div ref={host}>
      {!values.length ? (
        <div className="empty-line">这段时间还没有记录，补充后就能看见趋势。</div>
      ) : (
        <svg
          className="data-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${unit}趋势，${records.length}天，${bars ? '空缺日期不补零' : '空缺日期不连线'}`}
        >
          <title>{`${unit}趋势`}</title>
          {[low, (low + high) / 2, high].map((value, index) => (
            <g key={index}>
              <line
                className="grid-line"
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
              />
              <text x={left - 7} y={y(value) + 3} textAnchor="end">
                {tickLabel(value)}
              </text>
            </g>
          ))}
          {!bars && <path className="data-line" d={path} />}
          {records.map((record, index) => (
            <g key={record.date}>
              {record.value !== null &&
                Number.isFinite(record.value) &&
                (bars ? (
                  <rect
                    className="data-bar"
                    x={x(index) - barWidth / 2}
                    y={Math.min(y(record.value), y(0))}
                    width={barWidth}
                    height={Math.abs(y(0) - y(record.value))}
                    rx="2"
                  >
                    <title>{`${record.date}：${record.value.toFixed(1)} ${unit}`}</title>
                  </rect>
                ) : (
                  (records.length <= 7 || values.length <= 7 || isIsolatedPoint(index)) && (
                    <circle className="data-dot" cx={x(index)} cy={y(record.value)} r="2.5">
                      <title>{`${record.date}：${record.value} ${unit}`}</title>
                    </circle>
                  )
                ))}
              {ticks.has(index) && (
                <text
                  x={x(index)}
                  y={height - 7}
                  textAnchor={
                    index === 0 ? 'start' : index === records.length - 1 ? 'end' : 'middle'
                  }
                >
                  {record.date.slice(5).replace('-', '/')}
                </text>
              )}
            </g>
          ))}
          <text x={width - right} y="11" textAnchor="end">
            {unit}
          </text>
        </svg>
      )}
    </div>
  );
}
