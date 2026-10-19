import { todayOf } from '../../domain/selectors';
import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { DOMAINS } from '../../domain/models';
import type { DomainId, ModuleProps } from '../../domain/models';
import {
  assets,
  dateOffset as offsetFrom,
  focusHours,
  money,
  periodRecords,
} from '../../domain/selectors';
import { TrendChart } from './TrendChart';
import { HabitChart } from '../charts/HabitChart';
import { AssetChart } from '../charts/AssetChart';
import {
  accountLabels,
  assetSeries,
  bodyLabels,
  bodySeries,
  chartSource,
  focusProjects,
  focusSeries,
  habitSeries,
  seriesStats,
} from '../../domain/statistics';
import { completionDate } from '../../shared/date/service';
import { timezoneOf } from '../../domain/selectors';

export function DomainDetails({
  state,
  mutate,
  open,
  navigate,
  onAgent,
  view,
}: ModuleProps & { view: DomainId }) {
  const TODAY = todayOf(state);
  const dateOffset = (offset: number) => offsetFrom(offset, TODAY);
  const domain = DOMAINS.find((item) => item.id === view);
  if (!domain) return null;
  let content: ReactNode;
  let footer: ReactNode;
  if (view === 'body') {
    const metric = state.bodyMetric;
    const { label, unit } = bodyLabels[metric];
    const chartRecords = bodySeries(state);
    const { mean, count } = seriesStats(chartRecords);
    const feelings = Object.entries(state.wellbeing)
      .filter(([date]) => date >= dateOffset(1 - state.range) && date <= TODAY)
      .sort(([a], [b]) => b.localeCompare(a));
    content = (
      <>
        <div className="area-heading">
          <div className="chart-meta">
            <strong>
              {mean === null
                ? '—'
                : metric === 'steps'
                  ? Math.round(mean).toLocaleString('zh-CN')
                  : mean.toFixed(1)}
            </strong>
            <span>
              {unit} / {label}均值
            </span>
          </div>
          <div className="period-picker" aria-label="身体指标">
            {(Object.keys(bodyLabels) as (keyof typeof bodyLabels)[]).map((key) => (
              <button
                key={key}
                aria-pressed={metric === key}
                onClick={() =>
                  mutate((draft) => {
                    draft.bodyMetric = key;
                  })
                }
              >
                {bodyLabels[key].label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart records={chartRecords} metric={metric} unit={unit} />
        <section className="wellbeing-history">
          <div className="manager-heading">
            <h4>心情与精力记录</h4>
            <button
              className="text-button"
              onClick={() => open({ kind: 'record', record: 'wellbeing' })}
            >
              记录今天
            </button>
          </div>
          <div className="record-list">
            {feelings.length ? (
              feelings.map(([date, entry]) => (
                <div className="record-row" key={date}>
                  <div>
                    <span className="row-title">
                      {entry.mood} · 精力 {entry.energy}/5
                    </span>
                    <span className="row-meta">
                      {date}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => open({ kind: 'record', record: 'wellbeing', id: date })}
                  >
                    编辑
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-line">这段时间还没有记录，感受也值得留下。</p>
            )}
          </div>
        </section>
      </>
    );
    footer = (
      <>
        <Icon name="clock" />
        {dateOffset(1 - state.range)
          .slice(5)
          .replace('-', '/')}
        —{TODAY.slice(5).replace('-', '/')} · 有效记录 {count}/{state.range} 天 · 原始数值展示
      </>
    );
  } else if (view === 'habits') {
    const counts = habitSeries(state);
    const completed = counts.reduce((sum, entry) => sum + entry.count, 0);
    content = (
      <>
        <div className="chart-meta">
          <strong>
            {completed} / {counts.reduce((sum, entry) => sum + entry.planned, 0)}
          </strong>
          <span>已完成 / 自设计划次数</span>
        </div>
        <HabitChart state={state} />
      </>
    );
    footer = (
      <>
        <Icon name="leaf" />
        按各日期的启用计划统计 · 停用后保留历史打卡
      </>
    );
  } else if (view === 'diet') {
    const records = periodRecords(state.meals, state.range, TODAY).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const recordedDays = new Set(records.map((record) => record.date)).size;
    content = (
      <>
        <div className="chart-meta">
          <strong>
            {recordedDays} / {state.range}
          </strong>
          <span>有餐食记录的天数</span>
        </div>
        <div className="record-list">
          {records.length ? (
            records.slice(0, 4).map((record) => (
              <div className="record-row" key={record.id}>
                <div>
                  <span className="row-title">
                    {record.meal} · {record.content}
                  </span>
                  <span className="row-meta">
                    {record.date} · {record.portion || '份量待补充'}
                  </span>
                </div>
                <span className="row-value">
                  {record.calories === null ? '待补充' : `${record.calories} kcal`}
                  <small className="metric-label" style={{ display: 'block', textAlign: 'right' }}>
                    {record.calories === null ? '热量' : '估算'}
                  </small>
                </span>
              </div>
            ))
          ) : (
            <div className="empty-line">这段时间还没有餐食记录。</div>
          )}
        </div>
      </>
    );
    footer = (
      <>
        <Icon name="info" />
        展示最近 4 餐 · 营养数值为录入的估算值 · 未记录保留空缺
      </>
    );
  } else if (view === 'work') {
    const records = focusSeries(state);
    const projects = focusProjects(state);
    const completed = state.tasks.filter((task) => {
      const date = completionDate(task.completedAt, timezoneOf(state));
      return task.done && date && date >= dateOffset(1 - state.range) && date <= TODAY;
    });
    content = (
      <>
        <div className="chart-meta">
          <strong>{focusHours(state, state.range).toFixed(1)}</strong>
          <span>小时专注投入</span>
          <button className="text-button" onClick={() => open({ kind: 'todos' })}>
            查看待办 <Icon name="arrow-right" />
          </button>
        </div>
        <TrendChart records={records} metric="hours" unit="小时" bars />
        {projects.length > 0 && (
          <details className="chart-data">
            <summary>查看项目投入分布</summary>
            <table>
              <caption>当前范围内的专注投入 · 按分钟汇总</caption>
              <thead>
                <tr>
                  <th scope="col">项目</th>
                  <th scope="col">分钟</th>
                  <th scope="col">小时</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.name}>
                    <th scope="row">{project.name}</th>
                    <td>{project.minutes}</td>
                    <td>{(project.minutes / 60).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
        <div className="personal-inline">
          <span>阶段目标 · {state.goals.length} 个</span>
          <button className="text-button" onClick={() => open({ kind: 'goals' })}>
            管理阶段目标
          </button>
        </div>
      </>
    );
    footer = (
      <>
        <Icon name="briefcase" />
        这段时间完成 {completed.length} 项待办 · 按完成日期统计，未知完成日期不计入 ·
        时间投入与成果分别记录
      </>
    );
  } else {
    const balance = assets(state);
    const history = assetSeries(state);
    content = (
      <>
        <div className="chart-meta">
          <strong>{money(state, balance.net)}</strong>
          <span>净资产 / 人民币</span>
          <button
            className="icon-button"
            aria-label={`${state.hideMoney ? '显示' : '隐藏'}资产金额`}
            onClick={() =>
              mutate((draft) => {
                draft.hideMoney = !draft.hideMoney;
              })
            }
          >
            <Icon name={state.hideMoney ? 'eye-off' : 'eye'} />
          </button>
        </div>
        <AssetChart state={state} />
        <div className="record-list">
          {state.accounts.length ? (
            state.accounts.map((account) => (
              <div className="record-row" key={account.id}>
                <div>
                  <span className="row-title">{account.name}</span>
                  <span className="row-meta">
                    {accountLabels[account.type]} · 估值日期 {account.date}
                  </span>
                </div>
                <span className="row-value">{money(state, account.amount)}</span>
              </div>
            ))
          ) : (
            <p className="empty-line">还没有账户，添加余额后查看资产构成。</p>
          )}
        </div>
        <div className="asset-history">
          <p className="metric-label">
            {state.runtime?.kind === 'personal' ? '手动净资产汇总' : '原型历史估值'} · 近{' '}
            {state.range} 天
          </p>
          {state.hideMoney ? (
            <div className="empty-line">金额已隐藏</div>
          ) : (
            <TrendChart
              records={history}
              metric="value"
              unit="元"
              label={state.runtime?.kind === 'personal' ? '手动净资产汇总' : '原型历史估值'}
            />
          )}
          <p className="chart-summary">
            按原有估值日期展示；账户快照可单独查看，不将快照推算成连续净资产或账户流水。
          </p>
        </div>
      </>
    );
    footer = (
      <>
        <Icon name="info" />
        净资产 = 总资产 − 负债 · 可手动更新账户余额
      </>
    );
  }
  return (
    <div id="domain-content">
      <div className="detail-toolbar">
        <button className="text-button" onClick={() => navigate('overview')}>
          ← 返回总览
        </button>
        {
          <div className="period-picker" aria-label="详情统计时间范围">
            {([7, 30] as const).map((range) => (
              <button
                key={range}
                aria-pressed={state.range === range}
                onClick={() =>
                  mutate((draft) => {
                    draft.range = range;
                  })
                }
              >
                近 {range} 天
              </button>
            ))}
          </div>
        }
      </div>
      <section className="detail-panel glass-panel" aria-labelledby="detail-title">
        <div className="panel-heading">
          <div>
            <span className="eyebrow small">{domain.eyebrow}</span>
            <h3 id="detail-title">{domain.title}</h3>
          </div>
          <div className="panel-tools">
            <button className="text-button" onClick={() => onAgent(view)}>
              <Icon name="sparkles" />
              交给 Agent
            </button>
            <button
              className="icon-button"
              aria-label="添加当前板块记录"
              onClick={() => open({ kind: 'record', record: view })}
            >
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <div className="p3-tools">
          <button className="text-button" onClick={() => open({ kind: 'history', domain: view })}>
            查看与管理全部记录
          </button>
          {view === 'habits' && (
            <button className="text-button" onClick={() => open({ kind: 'habit-settings' })}>
              配置习惯
            </button>
          )}
          {view === 'assets' && (
            <button className="text-button" onClick={() => open({ kind: 'snapshots' })}>
              查看账户快照
            </button>
          )}
        </div>
        <p className="chart-context">
          来源：{chartSource(state)} · {state.runtime?.spaceName || '当前空间'}
          <br />
          统计日期：{dateOffset(1 - state.range)} → {TODAY}（含首尾） ·{' '}
          {view === 'assets' ? '构成按当前账户余额；估值按所选范围' : '仅统计当前空间和所选范围'}
        </p>
        <div id="detail-content">{content}</div>
        <div className="detail-footer">{footer}</div>
      </section>
    </div>
  );
}
