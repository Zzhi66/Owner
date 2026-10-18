import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { Modal } from '../../components/Modal';
import {
  DOMAINS,
  type DialogRequest,
  type ModuleProps,
  type RecordKind,
} from '../../domain/models';
import { activeHabits, definitionsOf, setHabitActive } from '../../domain/habits';
import { money, todayOf, uid } from '../../domain/selectors';
import { db, type Row, type TrashEntry } from '../../data/indexeddb/database';
import { restoreTrash } from '../../data/recovery/trash';
type Request = Extract<
  DialogRequest,
  { kind: 'history' | 'trash' | 'habit-settings' | 'snapshots' }
>;
interface HistoryItem {
  kind: RecordKind;
  id: string;
  date: string;
  title: string;
  detail: string;
  habitId?: string;
}
export function DataManager({
  state,
  mutate,
  open,
  toast,
  request,
  onClose,
}: ModuleProps & { request: Request; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(40);
  const [trash, setTrash] = useState<TrashEntry[]>([]);
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [editing, setEditing] = useState<{ id: string; name: string; baseline: string } | null>(
    null,
  );
  const [name, setName] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const today = todayOf(state);
  const spaceId = state.runtime?.spaceId || '';
  const readonly = state.runtime?.kind === 'legacy';
  useEffect(() => {
    if (readonly) return;
    const subscription =
      request.kind === 'trash'
        ? liveQuery(() =>
            db.trash.where('spaceId').equals(spaceId).reverse().sortBy('deletedAt'),
          ).subscribe({ next: setTrash, error: () => setError('回收站读取失败，请重新打开') })
        : request.kind === 'snapshots'
          ? liveQuery(() =>
              db.accountSnapshots.where('spaceId').equals(spaceId).toArray(),
            ).subscribe({ next: setSnapshots, error: () => setError('快照读取失败，请重新打开') })
          : null;
    return () => subscription?.unsubscribe();
  }, [spaceId, request.kind, readonly]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : '操作未保存，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const title =
    request.kind === 'history'
      ? `${DOMAINS.find((domain) => domain.id === request.domain)?.name}记录`
      : request.kind === 'trash'
        ? '回收站'
        : request.kind === 'snapshots'
          ? '账户快照'
          : '习惯配置';
  const records: HistoryItem[] = [];
  if (request.kind === 'history') {
    if (request.domain === 'body') {
      records.push(
        ...state.daily.map((row) => ({
          kind: 'body' as const,
          id: row.date,
          date: row.date,
          title: `睡眠 ${row.sleep ?? '—'} 小时 · 体重 ${row.weight ?? '—'} kg · ${row.steps ?? '—'} 步`,
          detail: row.note || row.source || '来源未知',
        })),
      );
      records.push(
        ...Object.entries(state.wellbeing).map(([date, row]) => ({
          kind: 'wellbeing' as const,
          id: date,
          date,
          title: `心情 ${row.mood} · 精力 ${row.energy}/5`,
          detail: row.reason,
        })),
      );
    } else if (request.domain === 'diet')
      records.push(
        ...state.meals.map((row) => ({
          kind: 'diet' as const,
          id: row.id,
          date: row.date,
          title: `${row.meal} · ${row.content}`,
          detail: `${row.portion || '份量未知'} · ${row.calories ?? '未知'} kcal（估算）`,
        })),
      );
    else if (request.domain === 'work')
      records.push(
        ...state.sessions.map((row) => ({
          kind: 'work' as const,
          id: row.id,
          date: row.date,
          title: row.title,
          detail: `${row.project} · ${row.minutes} 分钟`,
        })),
      );
    else if (request.domain === 'assets')
      records.push(
        ...state.accounts.map((row) => ({
          kind: 'assets' as const,
          id: row.id,
          date: row.date,
          title: row.name,
          detail: `${{ cash: '现金 / 存款', investment: '投资', other: '其他资产', liability: '负债' }[row.type]} · ${money(state, row.amount)}`,
        })),
      );
    else
      records.push(
        ...Object.entries(state.habits).flatMap(([date, logs]) =>
          Object.entries(logs).map(([habitId, done]) => ({
            kind: 'habits' as const,
            id: date,
            habitId,
            date,
            title: definitionsOf(state).find((habit) => habit.id === habitId)?.name || habitId,
            detail: done ? '已完成' : '未完成',
          })),
        ),
      );
  }
  const filtered = records
    .filter((row) =>
      `${row.date} ${row.title} ${row.detail}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal
      title={title}
      eyebrow="LOCAL RECORDS"
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      {readonly && <p className="field-hint">当前为旧记录只读预览，请先迁移到原型空间再编辑。</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {request.kind === 'history' && (
        <>
          <div className="p3-tools">
            <button
              className="secondary-button"
              disabled={readonly}
              onClick={() => open({ kind: 'record', record: request.domain })}
            >
              新增记录
            </button>
            {request.domain === 'body' && (
              <button
                className="text-button"
                disabled={readonly}
                onClick={() => open({ kind: 'record', record: 'wellbeing' })}
              >
                记录心情与精力
              </button>
            )}
            {request.domain === 'habits' && (
              <button className="text-button" onClick={() => open({ kind: 'habit-settings' })}>
                配置习惯
              </button>
            )}
            {request.domain === 'work' && (
              <>
                <button className="text-button" onClick={() => open({ kind: 'todos' })}>
                  管理待办
                </button>
                <button className="text-button" onClick={() => open({ kind: 'goals' })}>
                  管理目标
                </button>
              </>
            )}
          </div>
          <label className="field">
            搜索记录
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="日期、内容或项目"
            />
          </label>
          <p className="field-hint">共 {filtered.length} 条 · 删除后可在设置的回收站恢复。</p>
          <div className="p3-record-list">
            {filtered.slice(0, limit).map((row) => (
              <div className="record-row" key={`${row.kind}:${row.id}:${row.habitId || ''}`}>
                <div>
                  <strong className="row-title">{row.title}</strong>
                  <span className="row-meta">
                    {row.date} · {row.detail}
                  </span>
                </div>
                <button
                  className="text-button"
                  disabled={readonly}
                  aria-label={`编辑${row.title}`}
                  onClick={() =>
                    open({ kind: 'record', record: row.kind, id: row.id, habitId: row.habitId })
                  }
                >
                  编辑
                </button>
              </div>
            ))}
          </div>
          {!filtered.length && <p className="empty-line">还没有符合条件的记录。</p>}
          {filtered.length > limit && (
            <button className="text-button" onClick={() => setLimit(limit + 40)}>
              显示更多
            </button>
          )}
        </>
      )}
      {request.kind === 'habit-settings' && (
        <>
          <p>
            新增习惯从今天启用。停用只停止今天起的计划，历史打卡继续保留；名称修改不改变习惯 ID。
          </p>
          <form
            className="p3-tools"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(async () => {
                const value = (editing?.name ?? name).trim();
                if (!value) throw new Error('请填写习惯名称');
                const ok = await mutate((draft) => {
                  draft.habitDefinitions = definitionsOf(draft);
                  if (
                    draft.habitDefinitions.some(
                      (habit) => habit.id !== editing?.id && habit.name === value,
                    )
                  )
                    throw new Error('已有同名习惯');
                  if (editing) {
                    const habit = draft.habitDefinitions.find((item) => item.id === editing.id);
                    if (!habit || JSON.stringify(habit) !== editing.baseline)
                      throw new Error('习惯已在其他页面更新，请重新选择编辑');
                    habit.name = value;
                  } else
                    draft.habitDefinitions.push({
                      id: uid(),
                      name: value,
                      periods: [{ from: today }],
                    });
                });
                if (!ok) throw new Error('尚未保存，名称已保留，请查看提示');
                setEditing(null);
                setName('');
                toast('习惯配置已保存');
              });
            }}
          >
            <label className="field p3-grow">
              {editing ? '编辑习惯名称' : '新习惯名称'}
              <input
                required
                maxLength={100}
                value={editing?.name ?? name}
                onChange={(event) =>
                  editing
                    ? setEditing({ ...editing, name: event.target.value })
                    : setName(event.target.value)
                }
                disabled={busy || readonly}
              />
            </label>
            <button className="primary-button" disabled={busy || readonly}>
              保存习惯
            </button>
            {editing && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                取消编辑
              </button>
            )}
          </form>
          <div className="p3-record-list">
            {definitionsOf(state).map((habit) => {
              const active = activeHabits(state, today).some((item) => item.id === habit.id);
              return (
                <div className="record-row" key={habit.id}>
                  <div>
                    <strong className="row-title">{habit.name}</strong>
                    <span className="row-meta">
                      {active ? '今天已启用' : '已停用'} ·{' '}
                      {
                        Object.values(state.habits).filter((logs) => logs[habit.id] !== undefined)
                          .length
                      }{' '}
                      天有记录
                    </span>
                  </div>
                  <div className="p3-tools">
                    <button
                      className="text-button"
                      disabled={busy || readonly}
                      onClick={() =>
                        setEditing({
                          id: habit.id,
                          name: habit.name,
                          baseline: JSON.stringify(habit),
                        })
                      }
                    >
                      编辑
                    </button>
                    <button
                      className="text-button"
                      disabled={busy || readonly}
                      onClick={() =>
                        void perform(async () => {
                          if (
                            await mutate((draft) => setHabitActive(draft, habit.id, today, !active))
                          )
                            toast(active ? '已停用，历史打卡保留' : '已从今天启用');
                        })
                      }
                    >
                      {active ? '停用' : '启用'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {request.kind === 'trash' && (
        <>
          <p>
            删除记录按操作分组保留。恢复不会覆盖已有记录；恢复目标后，已解除的待办关联需手动选择。
          </p>
          <div className="p3-record-list">
            {trash.slice(0, limit).map((entry) => (
              <div className="record-row" key={entry.id}>
                <div>
                  <strong className="row-title">{entry.rows.length} 条已删除记录</strong>
                  <span className="row-meta">
                    {new Date(entry.deletedAt).toLocaleString('zh-CN')}
                  </span>
                  <span className="row-meta">
                    {entry.rows
                      .slice(0, 3)
                      .map(({ row }) =>
                        String(
                          row.value.title ||
                            row.value.name ||
                            row.value.content ||
                            row.value.text ||
                            row.date ||
                            '记录',
                        ),
                      )
                      .join(' · ')}
                  </span>
                </div>
                <button
                  className="secondary-button"
                  disabled={busy || readonly}
                  onClick={() =>
                    void perform(async () => {
                      if (state.runtime?.revision === undefined) throw new Error('请重新打开空间');
                      await restoreTrash(db, entry.id, state.runtime.revision);
                      toast('已恢复这组记录');
                    })
                  }
                >
                  恢复
                </button>
              </div>
            ))}
          </div>
          {!trash.length && <p className="empty-line">回收站为空。</p>}
          {trash.length > limit && (
            <button className="text-button" onClick={() => setLimit(limit + 40)}>
              显示更多
            </button>
          )}
        </>
      )}
      {request.kind === 'snapshots' && (
        <>
          <p>快照记录每次保存的账户余额及估值日期，金额单位为人民币；这些记录不代表收支流水。</p>
          <label className="field">
            筛选账户
            <select
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
            >
              <option value="">全部账户</option>
              {[
                ...new Map(
                  snapshots.map((row) => [String(row.value.accountId), String(row.value.name)]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                  {state.accounts.some((account) => account.id === id) ? '' : '（当前已删除）'}
                </option>
              ))}
            </select>
          </label>
          <div className="p3-record-list">
            {snapshots
              .filter((row) => !accountFilter || row.value.accountId === accountFilter)
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  (b.createdAt || '').localeCompare(a.createdAt || ''),
              )
              .slice(0, limit)
              .map((row) => (
                <div className="record-row" key={row.id}>
                  <div>
                    <strong className="row-title">{String(row.value.name)}</strong>
                    <span className="row-meta">
                      估值日期 {row.date} · {row.source}
                    </span>
                    <span className="row-meta">
                      {row.createdAt
                        ? `保存于 ${new Date(row.createdAt).toLocaleString('zh-CN')}`
                        : '历史创建时间未知'}
                    </span>
                  </div>
                  <strong>{money(state, Number(row.value.amountMinor) / 100)}</strong>
                </div>
              ))}
          </div>
          {!snapshots.length && (
            <p className="empty-line">尚无账户快照，保存账户余额后会在这里积累。</p>
          )}
          {snapshots.length > limit && (
            <button className="text-button" onClick={() => setLimit(limit + 40)}>
              显示更多
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
