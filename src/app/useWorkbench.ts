import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import type { Mutate, WorkbenchState } from '../domain/models';
import {
  db,
  emptyState,
  importPrototype,
  initializeDatabase,
  recoverExpiredAgentTasks,
  type Space,
} from '../data/indexeddb/database';
import { workbenchStore } from '../data/indexeddb/store';
import type { WorkbenchSnapshot } from '../domain/ports/workbench';
import { inspectLegacy } from '../data/migrations/legacy';
import { STORAGE_KEY } from '../data/prototype';
import { createDateService, PROTOTYPE_DATE } from '../shared/date/service';

const readLegacy = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
};
type Snapshot = WorkbenchSnapshot;
export function useWorkbench(notify: (message: string) => void) {
  const [report, setReport] = useState(() => inspectLegacy(readLegacy()));
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [active, setActive] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [today, setToday] = useState(() => createDateService().today());
  const current = useRef<Snapshot | null>(null);
  const [fallback] = useState(emptyState);
  const activeRef = useRef('');
  const saving = useRef(false);
  useEffect(() => {
    let disposed = false;
    initializeDatabase(db)
      .then(async () => {
        await recoverExpiredAgentTasks(db);
        const selected = await db.metadata.get('active-space');
        const next =
          selected && (await db.spaces.get(selected.value))
            ? selected.value
            : readLegacy() !== null
              ? 'legacy'
              : 'personal';
        if (!disposed) {
          activeRef.current = next;
          setActive(next);
        }
      })
      .catch(() => {
        if (!disposed)
          setWarning('本地数据库未能打开。旧记录保持原样，请检查浏览器存储权限后重新加载。');
      });
    const subscription = liveQuery(() => db.spaces.toArray()).subscribe({
      next: setSpaces,
      error: () => setWarning('无法读取空间列表，请重新加载。'),
    });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!active || active === 'legacy') {
      current.current = null;
      return;
    }
    const subscription = liveQuery(() => workbenchStore.read(active)).subscribe({
      next: (next) => {
        if (
          activeRef.current !== active ||
          (current.current?.space.id === active &&
            current.current.space.revision > next.space.revision)
        )
          return;
        current.current = next;
        setSnapshot(next);
      },
      error: () => setWarning('记录读取失败，请保留草稿后重新加载。'),
    });
    return () => subscription.unsubscribe();
  }, [active]);
  useEffect(() => {
    const refresh = () => setToday(createDateService().today());
    const refreshLegacy = () => setReport(inspectLegacy(readLegacy()));
    const recover = () => {
      void recoverExpiredAgentTasks(db).catch(() => {});
    };
    const timer = window.setInterval(() => {
      refresh();
      recover();
    }, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refreshLegacy);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refreshLegacy);
    };
  }, []);
  const selectSpace = useCallback(
    async (id: string) => {
      if (saving.current) {
        notify('正在保存，请稍后切换空间');
        return;
      }
      try {
        if (id !== 'legacy') {
          const next = await workbenchStore.read(id);
          await db.metadata.put({ key: 'active-space', value: id });
          current.current = next;
          setSnapshot(next);
        } else current.current = null;
        activeRef.current = id;
        setActive(id);
        setWarning(null);
      } catch {
        notify('空间未能打开，当前记录保持原样');
      }
    },
    [notify],
  );
  const mutate: Mutate = useCallback(
    async (change) => {
      const before = current.current;
      if (!before || activeRef.current === 'legacy') {
        notify('请先复制旧记录到原型空间，或切换到正式记录空间。');
        return false;
      }
      if (saving.current) {
        notify('上一项操作仍在保存，请稍后重试。');
        return false;
      }
      saving.current = true;
      try {
        const service = createDateService();
        const next = await workbenchStore.commit(
          before.space.id,
          before.space.revision,
          (draft) => {
            draft.runtime = {
              today: before.space.kind === 'personal' ? service.today() : PROTOTYPE_DATE,
              timezone: service.timezone,
              spaceId: before.space.id,
              kind: before.space.kind,
            };
            change(draft);
            delete draft.runtime;
          },
        );
        if (activeRef.current === before.space.id) {
          current.current = next;
          setSnapshot(next);
        }
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : '保存失败，原记录和当前草稿均已保留。');
        return false;
      } finally {
        saving.current = false;
      }
    },
    [notify],
  );
  async function migrate() {
    const latest = inspectLegacy(readLegacy());
    setReport(latest);
    if (latest.raw !== report.raw) {
      notify('旧记录已更新，请重新核对迁移报告后再复制。');
      return false;
    }
    if (!latest.state || !latest.raw) return false;
    try {
      const id = await importPrototype(db, latest.raw, latest.state);
      await selectSpace(id);
      notify('已复制到独立原型空间，旧 localStorage 保持原样。');
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : '迁移失败，未留下部分数据，可重试。');
      return false;
    }
  }
  const space = active === 'legacy' ? null : snapshot?.space;
  const state: WorkbenchState = {
    ...(active === 'legacy' ? report.state || fallback : snapshot?.state || fallback),
    runtime: {
      today: space?.kind === 'personal' ? today : PROTOTYPE_DATE,
      timezone: createDateService().timezone,
      spaceId: active,
      kind: active === 'legacy' ? 'legacy' : space?.kind || 'personal',
    },
  };
  return {
    state,
    warning: warning || (active === 'legacy' ? report.error : null),
    mutate,
    spaces,
    active,
    selectSpace,
    report,
    migrate,
    ready: !!active && (active === 'legacy' || snapshot?.space.id === active),
    refreshLegacy: () => setReport(inspectLegacy(readLegacy())),
  };
}
