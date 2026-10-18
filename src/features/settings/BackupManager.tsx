import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { Modal } from '../../components/Modal';
import type { ModuleProps } from '../../domain/models';
import { todayOf } from '../../domain/selectors';
import { db, type RecoveryPoint, type LegacyArchive } from '../../data/indexeddb/database';
import { exportBackup, importBackup, restoreRecoveryPoint } from '../../data/backup/service';
import { readBackupFile, type OwnerBackup } from '../../data/backup/format';
import { STORAGE_KEY } from '../../data/prototype';
import { download } from '../../shared/download';
const countRecords = (records: RecoveryPoint['snapshot']['records']) =>
  Object.values(records).reduce((sum, rows) => sum + rows.length, 0);
export function BackupManager({
  state,
  toast,
  onClose,
  onSelectSpace,
}: ModuleProps & { onClose: () => void; onSelectSpace: (id: string) => Promise<void> }) {
  const [file, setFile] = useState<OwnerBackup | null>(null);
  const [fileName, setFileName] = useState('');
  const [source, setSource] = useState('all');
  const [mode, setMode] = useState<'copy' | 'replace'>('copy');
  const [preview, setPreview] = useState<{
    sourceIds: string[];
    revision: number | undefined;
    mode: 'copy' | 'replace';
  } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [points, setPoints] = useState<RecoveryPoint[]>([]);
  const [archives, setArchives] = useState<LegacyArchive[]>([]);
  const [pointPreview, setPointPreview] = useState<{
    point: RecoveryPoint;
    revision: number;
  } | null>(null);
  const [pointConfirm, setPointConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const spaceId = state.runtime?.spaceId || '';
  const running = state.agentTasks.some((task) => task.status === 'running');
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    const subscription = liveQuery(async () => ({
      points: await db.recoveryPoints
        .where('spaceId')
        .equals(spaceId)
        .reverse()
        .sortBy('createdAt'),
      archives: await db.legacyArchives.toArray(),
    })).subscribe({
      next: ({ points, archives }) => {
        setPoints(points);
        setArchives(archives);
      },
      error: () => setError('恢复点读取失败，请重新打开'),
    });
    return () => subscription.unsubscribe();
  }, [spaceId]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(error instanceof Error ? error.message : '操作失败，当前记录保持原样');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function resetPreview() {
    setPreview(null);
    setConfirm(false);
  }
  const selected =
    file?.spaces.filter((bundle) => source === 'all' || bundle.space.id === source) || [];
  return (
    <Modal
      title="备份与恢复"
      eyebrow="LOCAL BACKUP & RECOVERY"
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <p className="field-hint">当前空间：{state.runtime?.spaceName || '旧记录预览'}</p>
      {error && (
        <p role="alert" ref={errorRef} tabIndex={-1} className="form-error">
          {error}
        </p>
      )}
      <section className="settings-section">
        <h3>完整备份</h3>
        <p>
          包含所有新版空间、偏好、账户快照、回收站、恢复点和旧原文。文件保存在你选择的位置，未上传到云端。
        </p>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              let legacyRaw: string | null;
              try {
                legacyRaw = localStorage.getItem(STORAGE_KEY);
              } catch {
                throw new Error('无法读取旧原文，请检查浏览器存储权限后再导出完整备份');
              }
              const backup = await exportBackup(db, legacyRaw);
              download(JSON.stringify(backup, null, 2), `owner-backup-${todayOf(state)}.json`);
              toast('完整备份文件已生成');
            })
          }
        >
          导出完整备份（所有空间）
        </button>
      </section>
      <section className="settings-section">
        <h3>导入备份</h3>
        <p>
          支持 Owner 完整备份 JSON，最多 20 MB。默认建立独立恢复副本；旧版「当前显示记录」JSON
          暂不支持直接导入。
        </p>
        <label className="field">
          选择备份文件
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(event) => {
              const input = event.currentTarget;
              const chosen = input.files?.[0];
              if (!chosen) return;
              void perform(async () => {
                setFile(null);
                resetPreview();
                setFileName(chosen.name);
                const backup = await readBackupFile(chosen).finally(() => {
                  input.value = '';
                });
                setFile(backup);
                setSource('all');
                setMode('copy');
              });
            }}
          />
        </label>
        {fileName && <p className="field-hint">文件：{fileName}</p>}
        {file && (
          <>
            <p className="field-hint">
              格式 v{file.version} · 导出于 {new Date(file.exportedAt).toLocaleString('zh-CN')} ·{' '}
              {file.spaces.length} 个空间 · {file.legacyArchives.length} 份旧原文
            </p>
            <div className="field-pair">
              <label className="field">
                导入方式
                <select
                  value={mode}
                  disabled={busy}
                  onChange={(event) => {
                    const value = event.target.value as 'copy' | 'replace';
                    setMode(value);
                    if (value === 'replace' && source === 'all')
                      setSource(
                        file.spaces.find((bundle) => bundle.space.kind === state.runtime?.kind)
                          ?.space.id || file.spaces[0]!.space.id,
                      );
                    resetPreview();
                  }}
                >
                  <option value="copy">建立独立恢复副本</option>
                  <option value="replace" disabled={state.runtime?.kind === 'legacy'}>
                    替换当前空间（先建立恢复点）
                  </option>
                </select>
              </label>
              <label className="field">
                选择来源空间
                <select
                  value={source}
                  disabled={busy}
                  onChange={(event) => {
                    setSource(event.target.value);
                    resetPreview();
                  }}
                >
                  {mode === 'copy' && <option value="all">全部空间</option>}
                  {file.spaces.map((bundle) => (
                    <option key={bundle.space.id} value={bundle.space.id}>
                      {bundle.space.name} ·{' '}
                      {bundle.space.kind === 'personal'
                        ? '正式'
                        : bundle.space.kind === 'demo'
                          ? '示例'
                          : '原型'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="secondary-button"
              disabled={busy || running}
              onClick={() => {
                setError('');
                setConfirm(false);
                if (mode === 'replace' && selected[0]?.space.kind !== state.runtime?.kind) {
                  setError('仅能替换同类型空间，示例或原型不能覆盖正式记录');
                  return;
                }
                setPreview({
                  sourceIds: selected.map((bundle) => bundle.space.id),
                  revision: state.runtime?.revision,
                  mode,
                });
              }}
            >
              预览导入结果
            </button>
            {preview && (
              <div className="backup-preview">
                <h4>
                  {preview.mode === 'copy'
                    ? `将建立 ${selected.length} 个独立副本`
                    : `将替换当前空间，原内容会保存为恢复点`}
                </h4>
                {selected.map((bundle) => (
                  <p key={bundle.space.id}>
                    {bundle.space.name}：{countRecords(bundle.records)} 条记录、
                    {bundle.accountSnapshots.length} 条账户快照、{bundle.trash.length} 组回收记录、
                    {bundle.recoveryPoints.length} 个恢复点
                  </p>
                ))}
                <p className="field-hint">
                  保留原始日期与来源。旧原文只保留为可下载存档，不写回
                  localStorage。运行中的演示任务会恢复为已中断。
                </p>
                {preview.mode === 'replace' && (
                  <label className="habit-row">
                    <input
                      type="checkbox"
                      checked={confirm}
                      onChange={(event) => setConfirm(event.target.checked)}
                      disabled={busy}
                    />
                    我已核对，确认替换当前空间
                  </label>
                )}
                <button
                  className="primary-button"
                  disabled={busy || running || (preview.mode === 'replace' && !confirm)}
                  onClick={() =>
                    void perform(async () => {
                      const target =
                        preview.mode === 'replace'
                          ? { id: spaceId, revision: preview.revision ?? -1 }
                          : undefined;
                      const ids = await importBackup(db, file, preview.sourceIds, target);
                      toast(
                        preview.mode === 'copy'
                          ? '已建立独立恢复副本'
                          : '替换完成，原内容已保存为恢复点',
                      );
                      onClose();
                      await onSelectSpace(ids[0]!);
                    })
                  }
                >
                  {preview.mode === 'copy' ? '确认建立恢复副本' : '确认替换当前空间'}
                </button>
              </div>
            )}
          </>
        )}
        {running && <p role="status">Agent 演示任务仍在运行，请完成后再导入或回退。</p>}
      </section>
      <section className="settings-section">
        <h3>当前空间的恢复点</h3>
        <p>替换空间和回退之前会自动保存当前内容；失败时全部回滚。</p>
        <div className="p3-record-list">
          {points.map((point) => (
            <div className="record-row" key={point.id}>
              <div>
                <strong className="row-title">{point.label}</strong>
                <span className="row-meta">
                  {new Date(point.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {countRecords(point.snapshot.records)} 条记录
                </span>
              </div>
              <button
                className="text-button"
                disabled={busy || running || state.runtime?.revision === undefined}
                onClick={() => {
                  setPointPreview({ point, revision: state.runtime!.revision! });
                  setPointConfirm(false);
                  setError('');
                }}
              >
                预览恢复点
              </button>
            </div>
          ))}
        </div>
        {!points.length && <p className="empty-line">尚无恢复点。</p>}
        {pointPreview && (
          <div className="backup-preview">
            <p>
              将恢复为 {new Date(pointPreview.point.createdAt).toLocaleString('zh-CN')} 的{' '}
              {countRecords(pointPreview.point.snapshot.records)} 条记录，并先保存当前内容。
            </p>
            <label className="habit-row">
              <input
                type="checkbox"
                checked={pointConfirm}
                disabled={busy}
                onChange={(event) => setPointConfirm(event.target.checked)}
              />
              确认回退当前空间
            </label>
            <button
              className="primary-button"
              disabled={busy || running || !pointConfirm}
              onClick={() =>
                void perform(async () => {
                  const id = await restoreRecoveryPoint(
                    db,
                    pointPreview.point.id,
                    pointPreview.revision,
                  );
                  toast('已回退，回退前的内容也保留为恢复点');
                  onClose();
                  await onSelectSpace(id);
                })
              }
            >
              确认回退到此恢复点
            </button>
          </div>
        )}
      </section>
      {!!archives.length && (
        <section className="settings-section">
          <h3>旧原文存档</h3>
          <p>仅供下载和人工核对，不会自动覆盖旧 localStorage。</p>
          {archives.map((archive) => (
            <div className="record-row" key={archive.id}>
              <span>{new Date(archive.capturedAt).toLocaleString('zh-CN')}</span>
              <button
                className="text-button"
                onClick={() =>
                  download(archive.raw, `owner-original-prototype-${archive.id}.txt`, 'text/plain')
                }
              >
                下载旧原文
              </button>
            </div>
          ))}
        </section>
      )}
    </Modal>
  );
}
