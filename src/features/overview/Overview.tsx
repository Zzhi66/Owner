import { activeHabits } from '../../domain/habits';
import { habitCounts } from '../../domain/selectors';
import { todayOf, completedNow, completedToday } from '../../domain/selectors';
import { useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import { DOMAINS } from '../../domain/models';
import type { DomainId, ModuleProps, Task } from '../../domain/models';
import { assets, dateOffset as offsetFrom, fmtMoney, money, uid } from '../../domain/selectors';

function Sparkline({ values }: { values: number[] }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((value, index) => [
    5 + (index * 94) / Math.max(1, values.length - 1),
    30 - ((value - min) / span) * 24,
  ]);
  const last = points.at(-1);
  return (
    <svg
      className="sparkline"
      viewBox="0 0 104 37"
      role="img"
      aria-label="近 7 天已记录的睡眠时长趋势"
    >
      <path
        d={points
          .map(([x, y], index) => `${index ? 'L' : 'M'}${x?.toFixed(1)},${y?.toFixed(1)}`)
          .join(' ')}
      />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" />}
    </svg>
  );
}

export function Overview(props: ModuleProps) {
  const { state, mutate, open, navigate, toast } = props;
  const TODAY = todayOf(state);
  const HABITS = activeHabits(state, TODAY);
  const dateOffset = (offset: number) => offsetFrom(offset, TODAY);
  const [todoTitle, setTodoTitle] = useState('');
  const [addedTask, setAddedTask] = useState<{ id: string; title: string } | null>(null);
  const [dragging, setDragging] = useState<DomainId | null>(null);
  const [dragOver, setDragOver] = useState<DomainId | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRefs = useRef<Partial<Record<DomainId, HTMLButtonElement | null>>>({});
  const balance = assets(state);
  const recentOrder: DomainId[] = state.order.filter((id) => id !== 'assets');
  const pending = state.tasks.filter((task) => !task.done && task.date <= TODAY);
  const completed = completedToday(state);
  const upcoming = [...state.events]
    .filter((item) => !item.done && item.date <= dateOffset(6))
    .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));

  async function moveCard(id: DomainId, destination: number) {
    const source = recentOrder.indexOf(id);
    if (
      source < 0 ||
      destination < 0 ||
      destination >= recentOrder.length ||
      source === destination
    )
      return false;
    const next = [...recentOrder];
    next.splice(source, 1);
    next.splice(destination, 0, id);
    return mutate((draft) => {
      draft.order = ['assets', ...next];
    });
  }
  async function handleKey(event: KeyboardEvent<HTMLButtonElement>, id: DomainId) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (await moveCard(id, recentOrder.indexOf(id) + (event.key === 'ArrowRight' ? 1 : -1))) {
      handleRefs.current[id]?.focus();
      toast('卡片顺序已调整');
    }
  }
  async function handleDrop(event: DragEvent<HTMLElement>, target: DomainId) {
    event.preventDefault();
    if (dragging && (await moveCard(dragging, recentOrder.indexOf(target))))
      toast('卡片顺序已调整');
    setDragging(null);
    setDragOver(null);
  }
  async function toggleTodo(task: Task, done: boolean) {
    if (
      await mutate((draft) => {
        const item = draft.tasks.find((entry) => entry.id === task.id);
        if (!item) return;
        item.done = done;
        if (done) item.completedAt = completedNow(state);
        else delete item.completedAt;
      })
    )
      inputRef.current?.focus({ preventScroll: true });
  }
  function todoRow(task: Task) {
    return (
      <label className={`today-todo-row habit-row ${task.done ? 'is-done' : ''}`} key={task.id}>
        <input
          type="checkbox"
          aria-label={task.title}
          checked={task.done}
          onChange={async (event) => toggleTodo(task, event.target.checked)}
        />
        <span className="todo-title">{task.title}</span>
        <small>{task.date < TODAY && !task.done ? '此前未完成' : task.project || '个人待办'}</small>
      </label>
    );
  }
  async function addGoalTodo(id: string) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal?.next || goal.progress === 100) return;
    if (state.tasks.some((task) => task.goalId === id && task.title === goal.next && !task.done)) {
      toast('这一步已在待办中');
      return;
    }
    const task = {
      id: uid(),
      title: goal.next,
      project: goal.title,
      date: TODAY,
      done: false,
      goalId: id,
    };
    if (
      await mutate((draft) => {
        if (
          draft.tasks.some(
            (entry) => entry.goalId === id && entry.title === goal.next && !entry.done,
          )
        )
          throw new Error('这一步已在待办中');
        draft.tasks.unshift(task);
      })
    ) {
      setAddedTask(task);
      toast('下一步已加入今日待办');
    }
  }
  function content(id: DomainId) {
    if (id === 'assets') {
      const updated = state.accounts
        .map((account) => account.date)
        .sort()
        .at(-1);
      const previous = updated
        ? [...state.assetHistory]
            .filter((entry) => entry.date < updated)
            .sort((a, b) => b.date.localeCompare(a.date))[0]
        : undefined;
      const delta = previous ? balance.net - previous.value : null;
      return (
        <>
          <div className="asset-summary">
            <div className="asset-primary">
              <span className="metric-label">净资产</span>
              <div className="metric">{money(state, balance.net)}</div>
            </div>
            <div className="asset-stat">
              <span className="metric-label">
                较上次记录{previous ? ` · ${previous.date.slice(5).replace('-', '/')}` : ''}
              </span>
              <strong>
                {delta === null
                  ? '暂无对比'
                  : state.hideMoney
                    ? '••••••'
                    : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtMoney(Math.abs(delta))}`}
              </strong>
            </div>
            <div className="asset-stat">
              <span className="metric-label">总资产</span>
              <strong>{money(state, balance.total)}</strong>
            </div>
            <div className="asset-stat">
              <span className="metric-label">负债</span>
              <strong>{money(state, balance.debt)}</strong>
            </div>
          </div>
          <div className="asset-updated">
            {updated ? `账户最近更新于 ${updated}` : '尚未记录账户'} · 各账户估值日期见详情
          </div>
        </>
      );
    }
    if (id === 'body') {
      const daily = state.daily
        .filter((entry) => entry.date >= dateOffset(-6) && entry.date <= TODAY)
        .sort((a, b) => a.date.localeCompare(b.date));
      const latest = [...daily].reverse().find((entry) => entry.sleep !== null);
      const weight = [...state.daily]
        .filter((entry) => entry.date <= TODAY && entry.weight !== null)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const feeling = state.wellbeing[TODAY];
      return (
        <>
          <div className="card-main">
            <div>
              <div className="metric">
                {latest?.sleep?.toFixed(1) ?? '—'}
                <small>小时</small>
              </div>
              <div className="metric-label">
                {latest
                  ? latest.date === TODAY
                    ? '昨晚睡眠'
                    : `${latest.date} 睡眠`
                  : '近 7 天暂无睡眠记录'}
              </div>
            </div>
            <div className="mini-trend">
              <Sparkline
                values={daily.flatMap((entry) => (entry.sleep === null ? [] : [entry.sleep]))}
              />
              <span>睡眠 · 近 7 天</span>
            </div>
          </div>
          <div className="summary-line">
            <span>最新体重</span>
            <strong>
              {weight?.weight !== null && weight?.weight !== undefined
                ? `${weight.weight.toFixed(1)} kg`
                : '未记录'}
            </strong>
            <small>{weight?.date.slice(5).replace('-', '/') ?? ''}</small>
          </div>
          <div className="personal-inline">
            <div>
              <span className="metric-label">今日心情与精力</span>
              <p>{feeling ? `${feeling.mood} · 精力 ${feeling.energy}/5` : '今天感觉怎么样？'}</p>
            </div>
            <button
              className="text-button"
              onClick={async () => open({ kind: 'record', record: 'wellbeing' })}
            >
              {feeling ? '更新' : '记录一下'}
            </button>
          </div>
        </>
      );
    }
    if (id === 'habits') {
      const today = state.habits[TODAY] ?? {};
      const week = habitCounts(state, 7);
      const weekCount = week.reduce((sum, entry) => sum + entry.count, 0);
      const weekPlan = week.reduce((sum, entry) => sum + entry.planned, 0);
      return (
        <>
          <div className="habit-summary">
            <strong>
              已完成 {HABITS.filter((habit) => today[habit.id]).length}
              <span> / {HABITS.length} 项</span>
            </strong>
            <span className="metric-label">
              近 7 天 {weekCount} / {weekPlan} 次
            </span>
          </div>
          <div className="habit-list">
            {HABITS.map((habit) => (
              <label className="habit-row" key={habit.id}>
                <input
                  type="checkbox"
                  checked={Boolean(today[habit.id])}
                  onChange={async (event) => {
                    const checked = event.target.checked;
                    if (
                      await mutate((draft) => {
                        if (!activeHabits(draft, TODAY).some((item) => item.id === habit.id))
                          throw new Error('习惯配置已变化，请核对后重试');
                        draft.habits[TODAY] = { ...draft.habits[TODAY], [habit.id]: checked };
                      })
                    )
                      toast(checked ? '今天的小习惯，完成一项' : '已更新打卡记录');
                  }}
                />
                <span className="habit-name">{habit.name}</span>
                <small>{today[habit.id] ? '已完成' : '待完成'}</small>
              </label>
            ))}
          </div>
        </>
      );
    }
    if (id === 'diet') {
      const meals = state.meals.filter((meal) => meal.date === TODAY);
      const mainMeals = ['早餐', '午餐', '晚餐'];
      const latest = meals.at(-1);
      return (
        <>
          <div className="card-main">
            <div>
              <div className="metric">
                {mainMeals.filter((label) => meals.some((meal) => meal.meal === label)).length}
                <small>/ 3 餐</small>
              </div>
              <div className="metric-label">今日三餐记录</div>
            </div>
            <button
              className="text-button"
              onClick={async () => open({ kind: 'record', record: 'diet' })}
            >
              <Icon name="plus" />
              记一餐
            </button>
          </div>
          <div className="food-summary">
            {mainMeals.map((label) => {
              const exists = meals.some((meal) => meal.meal === label);
              return (
                <span className={`food-pill ${exists ? '' : 'missing'}`} key={label}>
                  {exists ? '✓' : '·'} {label}
                </span>
              );
            })}
          </div>
          <div className="meal-preview">
            {latest ? `${latest.meal} · ${latest.content}` : '留下一餐，开始今天的记录。'}
          </div>
        </>
      );
    }
    const hours =
      state.sessions
        .filter((session) => session.date === TODAY)
        .reduce((sum, session) => sum + session.minutes, 0) / 60;
    const recentHours =
      state.sessions
        .filter((session) => session.date >= dateOffset(-6) && session.date <= TODAY)
        .reduce((sum, session) => sum + session.minutes, 0) / 60;
    const goal = state.goals.find((item) => item.progress < 100) ?? state.goals[0];
    return (
      <>
        <div className="card-main">
          <div>
            <div className="metric">
              {hours.toFixed(1)}
              <small>小时</small>
            </div>
            <div className="metric-label">今日专注投入</div>
          </div>
          <span className="metric-note">近 7 天 {recentHours.toFixed(1)} 小时</span>
        </div>
        <div className="personal-inline">
          <div>
            <span className="metric-label">
              阶段目标{state.goals.length > 1 ? ` · 共 ${state.goals.length} 个` : ''}
            </span>
            <p>{goal?.title ?? '留一个真正想推进的目标'}</p>
          </div>
          <button className="text-button" onClick={async () => open({ kind: 'goals' })}>
            {goal ? '管理' : '设置目标'}
          </button>
        </div>
        {goal && (
          <>
            <div className="goal-progress">
              <progress max="100" value={goal.progress} aria-label="阶段目标进度" />
              <span>{goal.progress}%</span>
            </div>
            <div className="goal-next">
              <span>下一步</span>
              <strong>{goal.next || '还没有填写下一步'}</strong>
              {goal.next && goal.progress < 100 && (
                <button className="text-button" onClick={async () => addGoalTodo(goal.id)}>
                  加入待办
                </button>
              )}
            </div>
          </>
        )}
      </>
    );
  }
  function card(id: DomainId) {
    const domain = DOMAINS.find((item) => item.id === id);
    if (!domain) return null;
    const detailLink = (
      <button
        className="card-link"
        aria-label={`查看${domain.name}详情`}
        onClick={async () => navigate(id)}
      >
        查看详情 <Icon name="arrow-right" />
      </button>
    );
    const title = id === 'assets' ? '资产概览' : domain.name;
    return (
      <article
        className={`dashboard-card ${dragOver === id ? 'drag-over' : ''}`}
        data-domain={id}
        key={id}
        onDragOver={(event) => {
          if (!dragging || id === 'assets') return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOver(id);
        }}
        onDragLeave={() => {
          if (dragOver === id) setDragOver(null);
        }}
        onDrop={(event) => {
          if (id !== 'assets') handleDrop(event, id);
        }}
      >
        <div className="card-heading">
          <span className={`domain-symbol ${id}`}>
            <Icon name={domain.icon} />
          </span>
          {id === 'assets' ? (
            <h2 className="card-title" id="assets-card-title">
              {title}
            </h2>
          ) : (
            <h3 className="card-title" id={`${id}-card-title`}>
              {title}
            </h3>
          )}
          {id === 'assets' ? (
            <div className="asset-tools">
              <button
                className="icon-button"
                aria-label={`${state.hideMoney ? '显示' : '隐藏'}资产金额`}
                onClick={async () =>
                  await mutate((draft) => {
                    draft.hideMoney = !draft.hideMoney;
                  })
                }
              >
                <Icon name={state.hideMoney ? 'eye-off' : 'eye'} />
              </button>
              {detailLink}
            </div>
          ) : (
            <>
              <span className="card-period">{id === 'body' ? '最近记录' : '今天'}</span>
              <button
                ref={(node) => {
                  handleRefs.current[id] = node;
                }}
                className="drag-handle"
                draggable
                aria-label={`拖动${domain.name}卡片，或按左右方向键调整顺序`}
                onKeyDown={(event) => handleKey(event, id)}
                onDragStart={(event) => {
                  setDragging(id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', id);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDragOver(null);
                }}
              >
                <Icon name="grip" />
              </button>
            </>
          )}
        </div>
        <div className="card-content">{content(id)}</div>
        {id !== 'assets' && (
          <div className="card-bottom">
            <button
              className="text-button"
              onClick={async () => open({ kind: 'record', record: id })}
            >
              <Icon name="plus" />
              {id === 'habits' ? '补记打卡' : '补充记录'}
            </button>
            {detailLink}
          </div>
        )}
      </article>
    );
  }
  return (
    <div id="overview-content">
      <section id="asset-overview" className="asset-overview" aria-labelledby="assets-card-title">
        {card('assets')}
      </section>
      <section className="today-todos glass-panel" aria-labelledby="today-todos-title">
        <div className="today-todos-heading">
          <div className="today-todos-label">
            <span className="domain-symbol">
              <Icon name="check-list" />
            </span>
            <h2 id="today-todos-title">今日待办</h2>
            <span className="todo-count">
              {pending.length ? `${pending.length} 项待处理` : '今天的清单已完成'}
            </span>
          </div>
          <button className="card-link" onClick={async () => open({ kind: 'todos' })}>
            查看全部 <Icon name="arrow-right" />
          </button>
        </div>
        <div className="schedule-summary">
          <div className="schedule-heading">
            <span>
              <Icon name="clock" />
              日程与重要日期
            </span>
            <div>
              <button
                className="text-button"
                aria-label="查看全部日程"
                onClick={async () => open({ kind: 'events' })}
              >
                查看全部{state.events.length ? ` · ${state.events.length}` : ''}
              </button>
              <button
                className="text-button"
                aria-label="添加日程"
                onClick={async () => open({ kind: 'record', record: 'event' })}
              >
                <Icon name="plus" />
                添加
              </button>
            </div>
          </div>
          {upcoming.length ? (
            <>
              <div className="schedule-items">
                {upcoming.slice(0, 3).map((item) => (
                  <div className="schedule-item" key={item.id}>
                    <span className={`schedule-time ${item.date === TODAY ? 'is-today' : ''}`}>
                      {item.date === TODAY ? '今天' : item.date.slice(5).replace('-', '/')} ·{' '}
                      {item.time || '全天'}
                      {item.date < TODAY ? ' · 已过日期' : ''}
                    </span>
                    <button
                      className="schedule-title"
                      onClick={async () => open({ kind: 'record', record: 'event', id: item.id })}
                    >
                      {item.title}
                    </button>
                    <span className="metric-label">{item.kind}</span>
                    <button
                      className="text-button"
                      aria-label={`完成日程：${item.title}`}
                      onClick={async () =>
                        await mutate((draft) => {
                          const event = draft.events.find((entry) => entry.id === item.id);
                          if (event) event.done = true;
                        })
                      }
                    >
                      完成
                    </button>
                  </div>
                ))}
              </div>
              {upcoming.length > 3 && (
                <button className="text-button" onClick={async () => open({ kind: 'events' })}>
                  还有 {upcoming.length - 3} 项，查看全部
                </button>
              )}
            </>
          ) : (
            <p className="schedule-empty">今天起 7 天暂无安排，可以记下预约、截止日期或纪念日。</p>
          )}
        </div>
        <div id="today-todo-list" className="today-todo-list">
          {pending.length ? (
            pending.slice(0, 3).map(todoRow)
          ) : (
            <p className="todo-empty">暂时没有待办，给今天留一点余地。</p>
          )}
          {pending.length > 3 && (
            <button className="todo-more text-button" onClick={async () => open({ kind: 'todos' })}>
              还有 {pending.length - 3} 项待处理，查看全部 <Icon name="arrow-right" />
            </button>
          )}
        </div>
        {completed.length > 0 && (
          <details className="completed-todos">
            <summary>已完成 {completed.length} 项</summary>
            <div className="today-todo-list">{completed.map(todoRow)}</div>
          </details>
        )}
        <form
          className="todo-add-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const title = todoTitle.trim();
            if (!title) {
              inputRef.current?.setCustomValidity('请填写待办内容');
              inputRef.current?.reportValidity();
              return;
            }
            const task = { id: uid(), title, project: '个人待办', date: TODAY, done: false };
            if (
              await mutate((draft) => {
                draft.tasks.unshift(task);
              })
            ) {
              setTodoTitle('');
              setAddedTask(task);
              inputRef.current?.focus();
            }
          }}
        >
          <Icon name="plus" />
          <label className="sr-only" htmlFor="today-todo-input">
            添加今日待办
          </label>
          <input
            ref={inputRef}
            id="today-todo-input"
            maxLength={160}
            placeholder="今天想推进什么？"
            autoComplete="off"
            required
            value={todoTitle}
            onChange={async (event) => {
              event.target.setCustomValidity('');
              setTodoTitle(event.target.value);
            }}
          />
          <button className="text-button" type="submit">
            添加
          </button>
        </form>
        {addedTask && (
          <div className="todo-add-status" aria-live="polite">
            <span>已添加：{addedTask.title}</span>
            <button
              className="text-button"
              onClick={async () => {
                if (
                  await mutate((draft) => {
                    draft.tasks = draft.tasks.filter((task) => task.id !== addedTask.id);
                  })
                ) {
                  setAddedTask(null);
                  toast('已撤销添加');
                }
              }}
            >
              撤销添加
            </button>
          </div>
        )}
      </section>
      <section aria-labelledby="personal-title">
        <div className="area-heading">
          <h2 id="personal-title">
            <span className="section-code">03 /</span> 我的近况
          </h2>
          <span className="section-hint">PERSONAL TELEMETRY · 从记录看见变化</span>
        </div>
        <div id="dashboard-cards" className="dashboard-grid">
          {recentOrder.map(card)}
        </div>
      </section>
    </div>
  );
}
