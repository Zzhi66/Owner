import { useState } from 'react';
import { Modal } from '../../components/Modal';
import type { Space } from '../../data/indexeddb/database';
import type { LegacyReport } from '../../data/migrations/legacy';
import { download } from '../../shared/download';
import { CopyRecords } from './CopyRecords';
export function SpaceControls({
  active,
  spaces,
  selectSpace,
  report,
  migrate,
  disabled,
  refreshLegacy,
}: {
  active: string;
  spaces: Space[];
  selectSpace: (id: string) => Promise<void>;
  report: LegacyReport;
  migrate: () => Promise<boolean>;
  disabled: boolean;
  refreshLegacy: () => void;
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  return (
    <div className="space-controls">
      <label>
        记录空间
        <select
          aria-label="记录空间"
          value={active}
          disabled={disabled || !active || show || copyOpen}
          onChange={(event) => void selectSpace(event.target.value)}
        >
          {!active && <option value="">正在打开…</option>}
          {report.raw !== null && <option value="legacy">旧记录预览 · 只读</option>}
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
              {space.kind === 'personal' ? ' · 真实日期' : ' · 固定日期'}
            </option>
          ))}
        </select>
      </label>
      {report.raw !== null && (
        <button className="text-button" disabled={disabled} onClick={() => setShow(true)}>
          旧记录迁移报告
        </button>
      )}
      {active === 'legacy' && (
        <p className="field-hint">旧记录仍在原位置。核对报告后，可复制到独立原型空间继续编辑。</p>
      )}
      {spaces.find((space) => space.id === active)?.kind === 'prototype' && (
        <button
          className="text-button"
          disabled={disabled || show || copyOpen}
          onClick={() => setCopyOpen(true)}
        >
          选择旧记录到正式空间
        </button>
      )}
      {copyOpen && <CopyRecords sourceId={active} onClose={() => setCopyOpen(false)} />}
      {show && (
        <Modal
          title="旧记录迁移报告"
          eyebrow="LOCAL DATA MIGRATION"
          onClose={() => !busy && setShow(false)}
        >
          <p>旧 localStorage 不会被修改。复制后的原型记录使用原始日期，正式记录保持独立。</p>
          {report.error ? (
            <p role="alert" className="form-error">
              {report.error}
            </p>
          ) : (
            <dl className="migration-report">
              <dt>记录数量</dt>
              <dd>{report.count} 条</dd>
              <dt>日期范围</dt>
              <dd>
                {report.first || '无日期'} → {report.last || '无日期'}
              </dd>
              <dt>来源不明</dt>
              <dd>{report.unknown} 条 · 保留为未知</dd>
            </dl>
          )}
          <p className="field-hint">
            未知的历史创建时间保留为空；资产历史独立标记为原型估值。这里不会自动把旧记录混入正式统计。
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              disabled={report.raw == null}
              onClick={() =>
                download(report.raw || '', 'owner-original-prototype.txt', 'text/plain')
              }
            >
              下载原始备份
            </button>
            <button className="text-button" disabled={busy} onClick={refreshLegacy}>
              重新读取
            </button>
            <button
              className="primary-button"
              disabled={busy || !report.state}
              onClick={async () => {
                setBusy(true);
                if (await migrate()) setShow(false);
                setBusy(false);
              }}
            >
              {busy ? '正在复制…' : '复制到原型空间'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
