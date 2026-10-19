import { useMemo } from 'react';
import type { WorkbenchState } from '../../domain/models';
import { habitSeries } from '../../domain/statistics';
import { ChartCanvas } from './ChartCanvas';
import { habitOption } from './options';

export function HabitChart({ state }: { state: WorkbenchState }) {
  const records = useMemo(() => habitSeries(state), [state]);
  const option = useMemo(() => habitOption(records), [records]);
  const completed = records.reduce((sum, entry) => sum + entry.count, 0);
  const planned = records.reduce((sum, entry) => sum + entry.planned, 0);
  const logged = records.filter((entry) => entry.value !== null).length;
  return (
    <figure className="stat-figure" aria-labelledby="habit-chart-caption">
      <figcaption id="habit-chart-caption" className="chart-caption">
        <strong>习惯完成热力图</strong>
        <span>
          {records[0]?.date} → {records.at(-1)?.date} · 单位：每日完成率（%）
        </span>
      </figcaption>
      {logged ? (
        <ChartCanvas
          kind="habits"
          option={option}
          label={`习惯完成热力图，${logged} 天有计划内打卡，完成 ${completed}/${planned} 次`}
        />
      ) : (
        <p className="empty-line">这段时间还没有计划内打卡，补记后查看热力图。</p>
      )}
      <p className="chart-summary">
        完成 {completed}/{planned} 次 · {logged} 天有打卡记录 ·{' '}
        {planned ? `计划完成率 ${((completed / planned) * 100).toFixed(1)}%` : '尚未安排习惯'}
      </p>
      <div className="heatmap-key">
        <span>空格：未记录 / 未安排</span>
        <span>
          <i className="heatmap-zero" />
          已记录 0%
        </span>
        <span>
          <i className="heatmap-full" />
          100%
        </span>
      </div>
      <p className="chart-summary">
        颜色按每日完成率显示，分母按当天启用的计划计算；未打卡不代表已确认未完成，计划外打卡留在记录列表。
      </p>
      <details className="chart-data">
        <summary>查看习惯数据表</summary>
        <table>
          <caption>每日启用计划与打卡</caption>
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">完成 / 计划</th>
              <th scope="col">记录状态</th>
            </tr>
          </thead>
          <tbody>
            {records.map((entry) => (
              <tr key={entry.date}>
                <th scope="row">{entry.date}</th>
                <td>
                  {entry.count}/{entry.planned}
                </td>
                <td>
                  {!entry.planned
                    ? '未安排'
                    : entry.value === null
                      ? '未记录'
                      : `${entry.value.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
