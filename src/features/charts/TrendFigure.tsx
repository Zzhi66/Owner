import { useId, useMemo } from 'react';
import type { ChartPoint } from '../../domain/statistics';
import { seriesStats } from '../../domain/statistics';
import { ChartCanvas } from './ChartCanvas';
import { trendOption } from './options';

export function TrendChart({
  records,
  metric,
  unit,
  bars = false,
  label,
}: {
  records: ChartPoint[];
  metric: string;
  unit: string;
  bars?: boolean;
  label?: string;
}) {
  const title =
    label ??
    ({ sleep: '睡眠', weight: '体重', steps: '活动量', hours: '专注投入', value: '净资产估值' }[
      metric
    ] ||
      '记录');
  const id = useId();
  const stats = seriesStats(records);
  const option = useMemo(
    () => trendOption(records, title, unit, bars),
    [records, title, unit, bars],
  );
  const format = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const range = `${records[0]?.date ?? '—'} → ${records.at(-1)?.date ?? '—'}`;
  return (
    <figure className="stat-figure" aria-labelledby={id}>
      <figcaption id={id} className="chart-caption">
        <strong>
          {title}
          {bars ? '统计' : '趋势'}
        </strong>
        <span>
          {range} · 单位：{unit}
        </span>
      </figcaption>
      {stats.count ? (
        <ChartCanvas
          option={option}
          kind="trend"
          label={`${title}${bars ? '柱状图' : '折线图'}，${records.length} 天，${stats.count} 天有效记录，空缺不补零、不连线`}
        />
      ) : (
        <p className="empty-line">这段时间还没有记录，补充后就能看见趋势。</p>
      )}
      <p className="chart-summary">
        {stats.count
          ? `有效记录 ${stats.count}/${records.length} 天 · ${bars ? `合计 ${format(stats.sum)}` : `均值 ${format(stats.mean!)}`} ${unit} · 空缺日期不补零${bars ? '' : '、不连线'}`
          : '未记录保留空缺。'}
      </p>
      <details className="chart-data">
        <summary>查看{title}数据表</summary>
        <table>
          <caption>
            {title} · {range}
          </caption>
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">
                {title}（{unit}）
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((entry) => (
              <tr key={entry.date}>
                <th scope="row">{entry.date}</th>
                <td>{entry.value === null ? '未记录' : `${format(entry.value)} ${unit}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
