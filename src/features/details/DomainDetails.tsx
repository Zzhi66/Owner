import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { TODAY } from '../../data/prototype';
import { DOMAINS, HABITS } from '../../domain/models';
import type { DomainId, ModuleProps } from '../../domain/models';
import {
  assets,
  dateOffset,
  focusHours,
  habitCounts,
  money,
  periodRecords,
} from '../../domain/selectors';
import { TrendChart } from './TrendChart';

const bodyLabels = {
  sleep: { label: '睡眠', unit: '小时' },
  weight: { label: '体重', unit: 'kg' },
  steps: { label: '活动量', unit: '步' },
};
const accountLabels = { cash: '现金', investment: '投资', other: '其他资产', liability: '负债' };

export function DomainDetails({
  state,
  mutate,
  open,
  navigate,
  onAgent,
  view,
}: ModuleProps & { view: DomainId }) {
  const domain = DOMAINS.find((item) => item.id === view);
  if (!domain) return null;
  const dates = Array.from({ length: state.range }, (_, index) =>
    dateOffset(index + 1 - state.range),
  );
  let content: ReactNode;
  let footer: ReactNode;
  if (view === 'body') {
    const daily = periodRecords(state.daily, state.range);
    const metric = state.bodyMetric;
    const { label, unit } = bodyLabels[metric];
    const values = daily.flatMap((entry) => {
      const value = entry[metric];
      return value === null || !Number.isFinite(value) ? [] : [value];
    });
    const mean = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const chartRecords = dates.map((date) => ({
      date,
      value: daily.find((entry) => entry.date === date)?.[metric] ?? null,
    }));
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
        —10/14 · 有效记录 {values.length}/{state.range} 天 · 原始数值展示
      </>
    );
  } else if (view === 'habits') {
    const counts = habitCounts(state, state.range);
    const completed = counts.reduce((sum, entry) => sum + entry.count, 0);
    content = (
      <>
        <div className="chart-meta">
          <strong>
            {completed} / {state.range * HABITS.length}
          </strong>
          <span>已完成 / 自设计划次数</span>
        </div>
        <div className="heatmap-grid" aria-label="每日习惯完成情况">
          {counts.map((entry) => (
            <div className={`heatmap-cell ${entry.count ? 'done' : ''}`} key={entry.date}>
              <span>{entry.date.slice(5).replace('-', '/')}</span>
              <strong>
                {entry.count}/{HABITS.length}
              </strong>
            </div>
          ))}
        </div>
      </>
    );
    footer = (
      <>
        <Icon name="leaf" />
        每天 3 项示例习惯 · 可在首页完成今日打卡
      </>
    );
  } else if (view === 'diet') {
    const records = periodRecords(state.meals, state.range).sort((a, b) =>
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
    const sessions = periodRecords(state.sessions, state.range);
    const records = dates.map((date) => {
      const entries = sessions.filter((session) => session.date === date);
      return {
        date,
        value: entries.length
          ? entries.reduce((sum, session) => sum + session.minutes, 0) / 60
          : null,
      };
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
        任务完成 {state.tasks.filter((task) => task.done).length}/{state.tasks.length} 项 ·
        时间投入与成果分别记录
      </>
    );
  } else {
    const balance = assets(state);
    const types = ['cash', 'investment', 'other'] as const;
    const portions = types.map((type) => ({
      type,
      amount: state.accounts
        .filter((account) => account.type === type)
        .reduce((sum, account) => sum + account.amount, 0),
    }));
    const history = Array.from({ length: 30 }, (_, index) => dateOffset(index - 29)).map(
      (date) => ({
        date,
        value: state.assetHistory.find((entry) => entry.date === date)?.value ?? null,
      }),
    );
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
        <div className="asset-breakdown detail-allocation">
          <div className="allocation-bar" role="img" aria-label="现金、投资、其他资产的构成">
            {portions.map(({ type, amount }) => (
              <span
                key={type}
                style={{ width: `${balance.total > 0 ? (amount / balance.total) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="asset-legend">
            {portions.map(({ type, amount }) => (
              <span key={type}>
                <i />
                {type === 'other' ? '其他' : accountLabels[type]}{' '}
                {balance.total > 0 ? Math.round((amount / balance.total) * 100) : 0}%
              </span>
            ))}
          </div>
        </div>
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
          <p className="metric-label">净资产历史 · 近 30 天</p>
          {state.hideMoney ? (
            <div className="empty-line">金额已隐藏</div>
          ) : (
            <TrendChart records={history} metric="value" unit="元" />
          )}
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
        {view !== 'assets' && (
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
        )}
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
        <div id="detail-content">{content}</div>
        <div className="detail-footer">{footer}</div>
      </section>
    </div>
  );
}
