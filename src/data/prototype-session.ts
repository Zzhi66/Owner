import { loadPrototype, savePrototype, STORAGE_KEY } from './prototype';
import type { StorageLike, WorkbenchState } from '../domain/models';

export type PrototypeSnapshot = ReturnType<typeof loadPrototype> & {
  raw: string | null | undefined;
  storage: StorageLike | null;
};

type StorageProvider = () => StorageLike;

/** Capture the record and its comparison value in one read, including denied Storage access. */
export function readPrototypeSnapshot(getStorage: StorageProvider): PrototypeSnapshot {
  try {
    const storage = getStorage();
    const raw = storage.getItem(STORAGE_KEY);
    const loaded = loadPrototype({ getItem: () => raw, setItem: () => {} });
    return { ...loaded, raw, storage };
  } catch {
    const unavailable: StorageLike = {
      getItem: () => {
        throw new Error('存储不可用');
      },
      setItem: () => {
        throw new Error('存储不可用');
      },
    };
    return { ...loadPrototype(unavailable), raw: undefined, storage: null };
  }
}

export function persistPrototypeSnapshot(
  previous: PrototypeSnapshot,
  draft: WorkbenchState,
  getStorage: StorageProvider,
): { ok: boolean; snapshot: PrototypeSnapshot; error: string | null } {
  const before = readPrototypeSnapshot(getStorage);
  if (before.raw === undefined || before.storage === null) {
    return { ok: false, snapshot: { ...before, state: previous.state }, error: before.warning };
  }
  if (before.raw !== previous.raw) {
    return { ok: false, snapshot: before, error: '记录已在其他页面更新，请核对后重新操作' };
  }
  if (!before.canSave || !previous.canSave) {
    return {
      ok: false,
      snapshot: before,
      error: before.warning || previous.warning || '现有记录暂不可写入',
    };
  }
  const storage = before.storage;
  let conflict = false;
  let writtenRaw: string | undefined;
  const guarded: StorageLike = {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      // localStorage has no transaction: check again immediately before the synchronous write.
      if (storage.getItem(key) !== previous.raw) {
        conflict = true;
        throw new Error('记录已更新');
      }
      storage.setItem(key, value);
      writtenRaw = value;
    },
  };
  const result = savePrototype(guarded, draft);
  if (!result.ok || writtenRaw === undefined) {
    if (conflict) {
      const latest = readPrototypeSnapshot(getStorage);
      return {
        ok: false,
        snapshot: latest.raw === undefined ? { ...latest, state: previous.state } : latest,
        error: '记录已在其他页面更新，请核对后重新操作',
      };
    }
    return {
      ok: false,
      snapshot: previous,
      error: result.error || '保存失败，请保留草稿并导出记录',
    };
  }
  // Keep the exact value we wrote, rather than pairing our state with a newer tab's value.
  return {
    ok: true,
    snapshot: { state: draft, warning: null, canSave: true, raw: writtenRaw, storage },
    error: null,
  };
}
