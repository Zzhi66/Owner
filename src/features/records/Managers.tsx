import { db } from '../../data/indexeddb/database';
import { resetDemo } from '../../data/backup/service';
import { todayOf, completedNow } from '../../domain/selectors';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { DOMAINS } from '../../domain/models';
import type { DialogRequest, ModuleProps } from '../../domain/models';
import { STORAGE_KEY } from '../../data/prototype';
import { uid } from '../../domain/selectors';
import { download } from '../../shared/download';

export function Managers({
  state,
  mutate,
  open,
  toast,
  request,
  onClose,
}: ModuleProps & {
  request: Exclude<
    DialogRequest,
    { kind: 'record' | 'history' | 'backup' | 'trash' | 'habit-settings' | 'snapshots' }
  >;
  onClose: () => void;
}) {
  const TODAY = todayOf(state);
  const [confirmReset, setConfirmReset] = useState(false);
  const [note, setNote] = useState('');
  const titles = {
    quick: '记录一点当下',
    events: '日程与重要日期',
    goals: '阶段目标',
    settings: '控制台设置',
    sources: '每条信息，都有来处',
    todos: '全部待办',
    notes: '随手留下的想法',
    artifact: '整理产物',
  };
  const artifact =
    request.kind === 'artifact'
      ? state.artifacts.find((item) => item.id === request.id)
      : undefined;
  async function goalTodo(id: string) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal?.next || goal.progress === 100) return;
    if (state.tasks.some((task) => task.goalId === id && task.title === goal.next && !task.done)) {
      toast('这一步已在待办中');
      return;
    }
    if (
      await mutate((draft) => {
        if (
          draft.tasks.some(
            (entry) => entry.goalId === id && entry.title === goal.next && !entry.done,
          )
        )
          throw new Error('这一步已在待办中');
        draft.tasks.unshift({
          id: uid(),
          title: goal.next,
          project: goal.title,
          date: TODAY,
          done: false,
          goalId: id,
        });
      })
    )
      toast('下一步已加入今日待办');
  }
  async function saveNote(event: FormEvent) {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;
    if (
      await mutate((draft) => {
        draft.notes.push({ id: uid(), date: TODAY, text });
      })
    ) {
      setNote('');
      toast('这条想法已留下');
    }
  }
  function exportRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        toast('此地址尚无已保存的原始记录');
        return;
      }
      download(raw, `owner-original-prototype-${TODAY}.txt`, 'text/plain');
    } catch {
      toast('当前无法读取本地原始记录');
    }
  }
  async function reset() {
    if (state.runtime?.kind !== 'demo') return;
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      await resetDemo(db, state.runtime.spaceId, state.runtime.revision ?? -1);
      toast('示例已恢复，原内容已保留为恢复点');
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复未完成，原记录保持不变');
    }
  }
  return (
    <Modal
      title={artifact?.title || titles[request.kind]}
      eyebrow={
        request.kind === 'artifact'
          ? 'LOCAL ARTIFACT · 演示产物'
          : request.kind === 'settings'
            ? 'SYSTEM PREFERENCES'
            : undefined
      }
      onClose={onClose}
    >
      {request.kind === 'quick' && (
        <>
          <p className="metric-label">选择记录类型，或留下一条想法。</p>
          <div className="record-shortcuts">
            {DOMAINS.map((domain) => (
              <button
                className="record-shortcut"
                key={domain.id}
                onClick={async () => open({ kind: 'record', record: domain.id })}
              >
                <span className={`domain-symbol ${domain.id}`}>
                  <Icon name={domain.icon} />
                </span>
                {domain.name}
                <Icon name="arrow-right" />
              </button>
            ))}
            {(
              [
                { record: 'wellbeing', name: '心情与精力', icon: 'heart' },
                { record: 'event', name: '日程与重要日期', icon: 'clock' },
                { record: 'goal', name: '阶段目标', icon: 'check-list' },
              ] as const
            ).map((item) => (
              <button
                className="record-shortcut"
                key={item.record}
                onClick={async () => open({ kind: 'record', record: item.record })}
              >
                <span className="domain-symbol">
                  <Icon name={item.icon} />
                </span>
                {item.name}
                <Icon name="arrow-right" />
              </button>
            ))}
          </div>
          <form onSubmit={saveNote} className="todo-add-form">
            <label htmlFor="quick-note" className="sr-only">
              随手记
            </label>
            <input
              id="quick-note"
              value={note}
              onChange={async (event) => setNote(event.target.value)}
              maxLength={300}
              required
              placeholder="一闪而过的想法，也值得留下…"
            />
            <button className="text-button" type="submit">
              保存随手记
            </button>
          </form>
          <p className="capture-status">记录只保存在当前浏览器，可在设置中导出。</p>
        </>
      )}
      {request.kind === 'events' && (
        <>
          <div className="manager-heading">
            <p className="metric-label">按日期排列 · 当前为单次日期记录</p>
            <button
              className="text-button"
              onClick={async () => open({ kind: 'record', record: 'event' })}
            >
              添加日程
            </button>
          </div>
          <div className="record-list">
            {[...state.events]
              .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
              .map((item) => (
                <div className="record-row" key={item.id}>
                  <div>
                    <strong className="row-title">{item.title}</strong>
                    <span className="row-meta">
                      {item.date} · {item.time || '全天'} · {item.kind} ·{' '}
                      {item.done ? '已完成' : '待处理'}
                    </span>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="text-button"
                      onClick={async () => open({ kind: 'record', record: 'event', id: item.id })}
                      aria-label={`编辑日程：${item.title}`}
                    >
                      编辑
                    </button>
                    <button
                      className="text-button"
                      onClick={async () =>
                        await mutate((draft) => {
                          const value = draft.events.find((entry) => entry.id === item.id);
                          if (value) value.done = !value.done;
                        })
                      }
                    >
                      {item.done ? '恢复' : '完成'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {!state.events.length && <p className="empty-line">还没有日程，先记下一件重要的事。</p>}
        </>
      )}
      {request.kind === 'goals' && (
        <>
          <div className="manager-heading">
            <p className="metric-label">最多 3 个目标 · 手动更新进度</p>
            <button
              className="text-button"
              disabled={state.goals.length >= 3}
              onClick={async () => open({ kind: 'record', record: 'goal' })}
            >
              添加目标
            </button>
          </div>
          <div className="goal-list">
            {state.goals.map((goal) => (
              <article className="goal-item" key={goal.id}>
                <div className="manager-heading">
                  <strong>{goal.title}</strong>
                  <button
                    className="text-button"
                    onClick={async () => open({ kind: 'record', record: 'goal', id: goal.id })}
                    aria-label={`编辑目标：${goal.title}`}
                  >
                    编辑
                  </button>
                </div>
                <div className="goal-progress">
                  <progress value={goal.progress} max={100} aria-label={`${goal.title}进度`} />
                  <span>{goal.progress}%</span>
                </div>
                <p className="metric-label">
                  {goal.due ? '目标日期 ' + goal.due : '未设置截止日期'}
                  {goal.progress === 100 ? ' · 已完成' : ''}
                </p>
                <div className="goal-next">
                  <span>下一步</span>
                  <strong>{goal.next || '还没有填写下一步'}</strong>
                  {goal.next && goal.progress < 100 && (
                    <button className="text-button" onClick={async () => goalTodo(goal.id)}>
                      加入待办
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!state.goals.length && <p className="empty-line">想想这个阶段最重要的一件事。</p>}
        </>
      )}
      {request.kind === 'todos' && (
        <>
          <p className="metric-label todo-dialog-hint">
            今日待办包含今天及此前未完成的事项；习惯打卡单独记录。
          </p>
          <button className="text-button" onClick={() => open({ kind: 'record', record: 'task' })}>
            添加待办
          </button>
          <div className="record-list">
            {[...state.tasks]
              .sort((a, b) => Number(a.done) - Number(b.done))
              .map((task) => (
                <div className="record-row" key={task.id}>
                  <label className="habit-row">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={async (event) => {
                        const checked = event.target.checked;
                        await mutate((draft) => {
                          const value = draft.tasks.find((item) => item.id === task.id);
                          if (value) {
                            value.done = checked;
                            if (checked) value.completedAt = completedNow(state);
                            else delete value.completedAt;
                          }
                        });
                      }}
                    />
                    <span>
                      <span className="row-title">{task.title}</span>
                      <span className="row-meta">
                        {task.project} · {task.date}
                      </span>
                    </span>
                  </label>
                  <span className="row-meta">{task.done ? '已完成' : '待处理'}</span>
                  <button
                    className="text-button"
                    onClick={() => open({ kind: 'record', record: 'task', id: task.id })}
                  >
                    编辑
                  </button>
                </div>
              ))}
          </div>
          {!state.tasks.length && <p className="empty-line">还没有待办，从总览添加第一项吧。</p>}
        </>
      )}
      {request.kind === 'notes' && (
        <div className="record-list">
          {[...state.notes].reverse().map((item) => (
            <div className="record-row" key={item.id}>
              <div>
                <span className="row-title">{item.text}</span>
                <span className="row-meta">{item.date} · 手动记录</span>
              </div>
              <button
                className="text-button"
                onClick={() => open({ kind: 'record', record: 'note', id: item.id })}
              >
                编辑
              </button>
            </div>
          ))}
          {!state.notes.length && (
            <p className="empty-line">还没有随手记，从快速记录留下一条想法吧。</p>
          )}
        </div>
      )}
      {request.kind === 'sources' && (
        <>
          {[
            {
              icon: 'check-list',
              title: '手动记录',
              description: '身体、习惯、餐食、时间投入与账户余额',
              status: '本地可用',
            },
            {
              icon: 'download',
              title: '文件导入',
              description: '后续接入表格、账单和健康数据文件',
              status: '待开发',
            },
            {
              icon: 'database',
              title: '自动同步',
              description: '后续按设备与服务选择连接方式',
              status: '未连接',
            },
          ].map((item) => (
            <div className="source-row" key={item.title}>
              <span>
                <Icon name={item.icon} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <span className="source-state">{item.status}</span>
            </div>
          ))}
          <p className="content-prose">
            正式记录与示例、原型记录分开保存。正式空间使用设备本地日期，示例和原型空间固定参考
            2026-10-14。当前没有连接外部账户或健康设备。
          </p>
        </>
      )}
      {request.kind === 'settings' && (
        <>
          <section className="settings-section">
            <h3>外观</h3>
            <p>贾维斯风格 HUD：深色控制台、青色数据线与环形核心。</p>
            <div className="settings-actions">
              <button
                className="secondary-button"
                onClick={async () =>
                  await mutate((draft) => {
                    draft.theme = 'jarvis';
                  })
                }
              >
                贾维斯 · 青蓝
              </button>
              <button
                className="secondary-button"
                onClick={async () =>
                  await mutate((draft) => {
                    draft.theme = 'midnight';
                  })
                }
              >
                深空 · 冰蓝
              </button>
            </div>
          </section>
          <section className="settings-section">
            <h3>记录与产物</h3>
            <p>
              记录保存在当前浏览器的
              IndexedDB，与站点地址绑定。完整备份包含所有空间与历史快照，当前显示记录导出仅供查看。
            </p>
            <div className="settings-actions">
              <button className="primary-button" onClick={() => open({ kind: 'backup' })}>
                备份与恢复
              </button>
              <button className="secondary-button" onClick={() => open({ kind: 'trash' })}>
                打开回收站
              </button>
              <button className="secondary-button" onClick={() => open({ kind: 'habit-settings' })}>
                配置习惯
              </button>
              <button
                className="secondary-button"
                onClick={async () =>
                  download(JSON.stringify(state, null, 2), `owner-records-${TODAY}.json`)
                }
              >
                导出当前显示记录
              </button>
              <button className="secondary-button" onClick={exportRaw}>
                导出本地原始内容
              </button>
              <button className="secondary-button" onClick={async () => open({ kind: 'notes' })}>
                查看随手记（{state.notes.length}）
              </button>
            </div>
          </section>
          <section className="settings-section">
            <h3>卡片顺序</h3>
            <p>拖动卡片右上角的六点按钮，或聚焦按钮后按左右方向键调整顺序。</p>
          </section>
          <section className="settings-section" hidden={state.runtime?.kind !== 'demo'}>
            <h3>恢复示例</h3>
            <p>仅替换示例体验空间。确认时先建立恢复点，可在备份与恢复中回退。</p>
            <button className="text-button form-delete" onClick={reset}>
              {confirmReset ? '确认建立恢复点并恢复示例（再点一次）' : '恢复初始示例数据'}
            </button>
          </section>
        </>
      )}
      {request.kind === 'artifact' &&
        (artifact ? (
          <>
            <div className="artifact-body">{artifact.body}</div>
            <div className="modal-footer">
              <span>
                {artifact.context} · {artifact.date}
              </span>
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  onClick={async () => {
                    if (!navigator.clipboard) {
                      toast('复制不可用，可以导出文件');
                      return;
                    }
                    void navigator.clipboard
                      .writeText(artifact.body)
                      .then(() => toast('已复制整理结果'))
                      .catch(() => toast('复制不可用，可以导出文件'));
                  }}
                >
                  复制
                </button>
                <button
                  className="primary-button"
                  onClick={async () =>
                    download(
                      artifact.body,
                      `owner-${artifact.title}-${artifact.date}.md`,
                      'text/markdown',
                    )
                  }
                >
                  导出
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="empty-line">这份产物不存在。</p>
        ))}
    </Modal>
  );
}
