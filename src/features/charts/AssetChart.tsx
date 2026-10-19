import { useMemo } from 'react';
import type { WorkbenchState } from '../../domain/models';
import { assetPortions } from '../../domain/statistics';
import { assets, money } from '../../domain/selectors';
import { ChartCanvas } from './ChartCanvas';
import { allocationOption, chartColors } from './options';

export function AssetChart({ state }: { state: WorkbenchState }) {
  const portions = useMemo(() => assetPortions(state), [state]);
  const option = useMemo(() => allocationOption(portions), [portions]);
  const balance = assets(state);
  if (state.hideMoney) return <p className="empty-line">金额已隐藏，资产构成与估值图一并隐藏。</p>;
  return (
    <figure className="stat-figure" aria-labelledby="asset-chart-caption">
      <figcaption id="asset-chart-caption" className="chart-caption">
        <strong>资产构成</strong>
        <span>当前保存的账户余额 · 人民币（元）</span>
      </figcaption>
      {balance.total > 0 ? (
        <div className="allocation-chart">
          <div className="allocation-donut">
            <ChartCanvas
              kind="assets"
              option={option}
              label="现金、投资与其他资产构成环形图，负债单独列示"
            />
            <div className="donut-center" aria-hidden="true">
              总资产<small>{money(state, balance.total)}</small>
            </div>
          </div>
          <ul className="allocation-key">
            {portions.map((entry, index) => (
              <li key={entry.name}>
                <i style={{ background: chartColors[index] }} />
                <span>
                  {entry.name}
                  <small>{((entry.value / balance.total) * 100).toFixed(1)}%</small>
                </span>
                <strong>{money(state, entry.value)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="empty-line">暂无可展示的正资产余额，添加账户余额后查看构成。</p>
      )}
      <p className="chart-summary">
        总资产 {money(state, balance.total)} · 负债 {money(state, balance.debt)} · 净资产{' '}
        {money(state, balance.net)}。负债单独列示，不计入资产构成比例。
      </p>
      <details className="chart-data">
        <summary>查看资产构成数据表</summary>
        <table>
          <caption>当前账户余额汇总 · 各账户估值日期见下方清单</caption>
          <thead>
            <tr>
              <th scope="col">类别</th>
              <th scope="col">金额（元）</th>
              <th scope="col">占总资产</th>
            </tr>
          </thead>
          <tbody>
            {portions.map((entry) => (
              <tr key={entry.name}>
                <th scope="row">{entry.name}</th>
                <td>{money(state, entry.value)}</td>
                <td>
                  {balance.total > 0 ? `${((entry.value / balance.total) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">负债</th>
              <td>{money(state, balance.debt)}</td>
              <td>单独列示</td>
            </tr>
          </tbody>
        </table>
      </details>
    </figure>
  );
}
