import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { db, type Row, type Collection } from '../../data/indexeddb/database';
import { HABITS } from '../../domain/models';
function describeRecord(table: Collection, row: Row, reveal: boolean): string {
  const value = row.value;
  if (table === 'habitDefinitions') return `习惯配置：${value.name}（保留启用日期）`;
  if (table === 'daily')
    return `睡眠 ${value.sleep ?? '未记录'} 小时 · 体重 ${value.weight ?? '未记录'} kg · 步数 ${value.steps ?? '未记录'}${value.note ? ` · ${value.note}` : ''}`;
  if (table === 'wellbeing') return `${value.mood} · 精力 ${value.energy}/5 · ${value.reason}`;
  if (table === 'habitLogs')
    return `${HABITS.find((habit) => habit.id === value.habitId)?.name || value.habitId} · ${value.done ? '已完成' : '未完成'}`;
  if (table === 'meals')
    return `${value.meal} · ${value.content} · ${value.portion || '份量未知'} · 热量 ${value.calories ?? '未知'} kcal`;
  if (table === 'sessions') return `${value.project} · ${value.title} · ${value.minutes} 分钟`;
  if (table === 'accounts')
    return `${value.name} · ${{ cash: '现金 / 存款', investment: '投资', other: '其他资产', liability: '负债' }[String(value.type)]} · ${reveal ? `¥${(Number(value.amountMinor) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '金额已隐藏'}`;
  if (table === 'goals')
    return `${value.title} · ${value.progress}% · 下一步：${value.next || '未设置'}`;
  if (table === 'events')
    return `${value.title} · ${value.time || '全天'}${value.time ? ` / ${value.timezone || '时区未知'}` : ''} · ${value.note}`;
  return String(value.title || '记录');
}
import {
  copyToPersonal,
  previewCopy,
  type CopyDomain,
  type CopyPreview,
  type CopySelection,
} from '../../data/migrations/copy';
export function CopyRecords({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const [selection, setSelection] = useState<CopySelection>({
    domain: 'body',
    from: '2026-09-01',
    to: '2026-10-14',
    includeUnknown: false,
  });
  const [preview, setPreview] = useState<CopyPreview | null>(null);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  function change(next: Partial<CopySelection>) {
    setSelection({ ...selection, ...next });
    setPreview(null);
    setError('');
    setResult('');
    setReveal(false);
  }
  const labels = {
    body: '身体与心情',
    habits: '习惯打卡',
    diet: '饮食',
    work: '学习 / 工作、待办与目标',
    assets: '账户余额',
    calendar: '日程',
  };
  return (
    <Modal
      title="选择旧记录到正式空间"
      eyebrow="REVIEW BEFORE COPYING"
      onClose={() => !busy && onClose()}
    >
      <p>
        保留原日期和来源，复制前核对具体记录。已复制项会跳过；遇到同日记录或同名账户冲突时停止。
      </p>
      <div className="record-fields">
        <label className="field">
          领域
          <select
            value={selection.domain}
            disabled={busy}
            onChange={(event) => change({ domain: event.target.value as CopyDomain })}
          >
            {Object.entries(labels).map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-pair">
          <label className="field">
            开始日期
            <input
              type="date"
              value={selection.from}
              disabled={busy}
              onInput={(event) => change({ from: event.currentTarget.value })}
              onChange={(event) => change({ from: event.target.value })}
            />
          </label>
          <label className="field">
            结束日期
            <input
              type="date"
              value={selection.to}
              disabled={busy}
              onInput={(event) => change({ to: event.currentTarget.value })}
              onChange={(event) => change({ to: event.target.value })}
            />
          </label>
        </div>
        <label className="habit-row">
          <input
            type="checkbox"
            checked={selection.includeUnknown}
            disabled={busy}
            onChange={(event) => change({ includeUnknown: event.target.checked })}
          />
          包含来源不明项（我会在预览中逐条核对）
        </label>
      </div>
      <p className="field-hint">
        自定义习惯的打卡会同时复制缺失的习惯配置，已有配置保持不变。
        工作记录会同时复制关联目标并重建关联。原型历史净资产估值、Agent
        对话、产物和随手记保留在原型空间，不在此入口复制。
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {result && <p role="status">{result}</p>}
      {preview && (
        <>
          {selection.domain === 'assets' && (
            <button
              className="text-button"
              aria-pressed={reveal}
              onClick={() => setReveal(!reveal)}
            >
              {reveal ? '隐藏预览金额' : '在预览中显示金额'}
            </button>
          )}
          <p>
            将复制 {preview.candidates.length} 条；跳过来源不明或已复制项 {preview.skipped} 条。
          </p>
          {preview.conflicts.map((message) => (
            <p key={message} className="form-error" role="alert">
              {message}
            </p>
          ))}
          <div className="copy-preview">
            {preview.candidates.map(({ table, row }) => (
              <div className="record-row" key={`${table}:${row.id}`}>
                <span>
                  {row.date || '关联目标'} · {describeRecord(table, row, reveal)}
                </span>
                <small>{row.source}</small>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="modal-actions">
        <button
          className="secondary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            setResult('');
            try {
              setPreview(await previewCopy(db, sourceId, selection));
            } catch (error) {
              setError(error instanceof Error ? error.message : '预览失败');
            } finally {
              setBusy(false);
            }
          }}
        >
          预览选择的记录
        </button>
        <button
          className="primary-button"
          disabled={busy || !preview?.candidates.length || !!preview.conflicts.length}
          onClick={async () => {
            if (!preview) return;
            setBusy(true);
            try {
              const count = await copyToPersonal(db, sourceId, selection, preview);
              setPreview(null);
              setResult(`已复制 ${count} 条，可切换到正式记录查看。`);
            } catch (error) {
              setError(error instanceof Error ? error.message : '复制失败，正式记录保持原样');
              setPreview(null);
            } finally {
              setBusy(false);
            }
          }}
        >
          确认复制到正式记录
        </button>
      </div>
    </Modal>
  );
}
