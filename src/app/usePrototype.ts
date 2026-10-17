import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEY } from '../data/prototype';
import { persistPrototypeSnapshot, readPrototypeSnapshot } from '../data/prototype-session';
import type { Mutate } from '../domain/models';

const browserStorage = () => window.localStorage;

export function usePrototype(notify: (message: string) => void) {
  const [snapshot, setSnapshot] = useState(() => readPrototypeSnapshot(browserStorage));
  const current = useRef(snapshot);
  const mutate: Mutate = useCallback(
    (change) => {
      const previous = current.current;
      if (!previous.canSave) {
        notify(previous.warning || '现有记录需要恢复，暂不可写入');
        return false;
      }
      try {
        const draft = structuredClone(previous.state);
        change(draft);
        const result = persistPrototypeSnapshot(previous, draft, browserStorage);
        current.current = result.snapshot;
        setSnapshot(result.snapshot);
        if (!result.ok) notify(result.error || '保存失败，请保留草稿并导出记录');
        return result.ok;
      } catch {
        notify('当前操作未保存，请保留编辑内容后重试');
        return false;
      }
    },
    [notify],
  );
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = readPrototypeSnapshot(browserStorage);
      if (next.storage && event.storageArea && event.storageArea !== next.storage) return;
      const safeNext = next.raw === undefined ? { ...next, state: current.current.state } : next;
      current.current = safeNext;
      setSnapshot(safeNext);
      notify(safeNext.warning || '已读取其他页面更新的记录');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [notify]);
  const { state, warning, canSave } = snapshot;
  return { state, warning, canSave, mutate };
}
