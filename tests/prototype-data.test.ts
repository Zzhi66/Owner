import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  loadPrototype,
  savePrototype,
  STORAGE_KEY,
  TODAY,
} from '../src/data/prototype';
import {
  assets,
  dateOffset,
  focusHours,
  habitCounts,
  money,
  periodRecords,
} from '../src/domain/selectors';
import type { StorageLike } from '../src/domain/models';
import { persistPrototypeSnapshot, readPrototypeSnapshot } from '../src/data/prototype-session';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  let writes = 0;
  const storage: StorageLike = {
    getItem: (key) => (key === STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === STORAGE_KEY) {
        value = next;
        writes++;
      }
    },
  };
  return { storage, value: () => value, writes: () => writes };
}

describe('P1 prototype compatibility', () => {
  it('creates the original fixed-date sample data without immediately writing it', () => {
    const memory = memoryStorage();
    const loaded = loadPrototype(memory.storage);
    expect(loaded.canSave).toBe(true);
    expect(loaded.warning).toBeNull();
    expect(memory.writes()).toBe(0);
    expect(loaded.state.daily).toHaveLength(30);
    expect(loaded.state.daily[0]?.date).toBe('2026-09-15');
    expect(loaded.state.daily.at(-1)?.sleep).toBe(7.2);
    expect(loaded.state.meals).toHaveLength(83);
    expect(loaded.state.tasks.filter((task) => !task.done)).toHaveLength(4);
    expect(loaded.state.order).toEqual(['assets', 'body', 'diet', 'work', 'habits']);
    expect(assets(loaded.state)).toEqual({ total: 138600, debt: 10000, net: 128600 });
  });

  it('fills older optional collections and normalizes legacy preferences without changing personal records', () => {
    const original = createInitialState();
    const old: Record<string, unknown> = {
      ...original,
      theme: 'forest',
      order: ['assets', 'work', 'diet', 'body', 'habits'],
      externalMetadata: { retained: true },
    };
    delete old.wellbeing;
    delete old.events;
    delete old.goals;
    const memory = memoryStorage(JSON.stringify(old));
    const { state, canSave } = loadPrototype(memory.storage);
    expect(canSave).toBe(true);
    expect(state.wellbeing).toEqual({});
    expect(state.events).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.theme).toBe('jarvis');
    expect(state.order).toEqual(['assets', 'work', 'diet', 'body', 'habits']);
    expect(state.daily).toEqual(original.daily);
    expect(state.tasks).toEqual(original.tasks);
    expect(state.externalMetadata).toEqual({ retained: true });
    expect(memory.value()).toBe(JSON.stringify(old));
    expect(memory.writes()).toBe(0);
    expect(savePrototype(memory.storage, state)).toEqual({ ok: true, error: null });
    expect(JSON.parse(memory.value() ?? '{}').externalMetadata).toEqual({ retained: true });
  });

  it('updates only the exact old default card order and marks unfinished demo jobs interrupted', () => {
    const state = createInitialState();
    state.order = ['assets', 'body', 'habits', 'diet', 'work'];
    state.agentTasks = [
      { id: 'job', title: '测试演示任务', context: '个人总览', status: 'running', date: TODAY },
    ];
    const memory = memoryStorage(JSON.stringify(state));
    const loaded = loadPrototype(memory.storage);
    expect(loaded.state.order).toEqual(['assets', 'body', 'diet', 'work', 'habits']);
    expect(loaded.state.agentTasks[0]?.status).toBe('interrupted');
    expect(memory.writes()).toBe(0);
  });

  it.each([
    ['malformed JSON', '{broken'],
    ['unknown version', JSON.stringify({ ...createInitialState(), schemaVersion: 2 })],
    [
      'invalid numeric records',
      JSON.stringify({
        ...createInitialState(),
        sessions: [{ id: 'bad', date: TODAY, title: '不可识别记录', project: '', minutes: '120' }],
      }),
    ],
    [
      'invalid optional collection',
      JSON.stringify({ ...createInitialState(), events: { doNotLose: true } }),
    ],
    ['empty stored value', ''],
  ])('preserves %s and blocks every attempted replacement', (_, raw) => {
    const memory = memoryStorage(raw);
    const loaded = loadPrototype(memory.storage);
    expect(loaded.canSave).toBe(false);
    expect(loaded.warning).toBeTruthy();
    expect(savePrototype(memory.storage, loaded.state).ok).toBe(false);
    expect(memory.value()).toBe(raw);
    expect(memory.writes()).toBe(0);
  });

  it('rejects newly invalid data without replacing a valid saved record', () => {
    const state = createInitialState();
    const raw = JSON.stringify(state);
    const memory = memoryStorage(raw);
    state.sessions.push({
      id: 'bad',
      date: TODAY,
      title: '测试',
      project: '',
      minutes: Number.NaN,
    });
    expect(savePrototype(memory.storage, state).ok).toBe(false);
    expect(memory.value()).toBe(raw);
  });

  it('reports read and quota failures as failures without claiming a successful save', () => {
    const readFailure: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('must not write');
      },
    };
    expect(loadPrototype(readFailure).canSave).toBe(false);
    expect(savePrototype(readFailure, createInitialState()).ok).toBe(false);
    const quotaFailure: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const result = savePrototype(quotaFailure, createInitialState());
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('retains unknown state extensions already on disk when saving a known state snapshot', () => {
    const state = createInitialState();
    const memory = memoryStorage(JSON.stringify({ ...state, otherClientSetting: { key: 'keep' } }));
    expect(savePrototype(memory.storage, state).ok).toBe(true);
    expect(JSON.parse(memory.value() ?? '{}').otherClientSetting).toEqual({ key: 'keep' });
  });
});

describe('fixed-date statistics', () => {
  it('uses inclusive 7/30-day windows, excluding records after the prototype date', () => {
    const records = [-30, -29, -7, -6, 0, 1].map((offset) => ({
      date: dateOffset(offset),
      value: offset,
    }));
    expect(periodRecords(records, 7).map((record) => record.value)).toEqual([-6, 0]);
    expect(periodRecords(records, 30).map((record) => record.value)).toEqual([-29, -7, -6, 0]);
    expect(dateOffset(0)).toBe(TODAY);
    expect(dateOffset(-14)).toBe('2026-09-30');
  });

  it('sums every focus entry and fills missing habit days without counting unknown habits', () => {
    const state = createInitialState();
    expect(focusHours(state, 7)).toBe(18.5);
    state.sessions = [
      { id: 'first', date: TODAY, title: '第一段', project: '', minutes: 60 },
      { id: 'second', date: TODAY, title: '第二段', project: '', minutes: 30 },
      { id: 'old', date: dateOffset(-7), title: '范围外', project: '', minutes: 999 },
    ];
    state.habits = { [TODAY]: { read: true, move: false, log: true, custom: true } };
    expect(focusHours(state, 7)).toBe(1.5);
    expect(habitCounts(state, 7)).toHaveLength(7);
    expect(habitCounts(state, 7).at(-1)).toEqual({ date: TODAY, count: 2 });
    expect(
      habitCounts(state, 7)
        .slice(0, -1)
        .every((entry) => entry.count === 0),
    ).toBe(true);
  });

  it('separates liabilities from assets and masks all displayed amounts when requested', () => {
    const state = createInitialState();
    expect(money(state, assets(state).net)).toBe('¥128,600');
    state.hideMoney = true;
    expect(money(state, assets(state).net)).toBe('••••••');
  });
});

describe('storage session snapshots', () => {
  it('captures state and comparison value in a single storage read', () => {
    const first = createInitialState();
    first.theme = 'midnight';
    const second = createInitialState();
    let reads = 0;
    const firstRaw = JSON.stringify(first);
    const storage: StorageLike = {
      getItem: () => (++reads === 1 ? firstRaw : JSON.stringify(second)),
      setItem: () => {
        throw new Error('must not write');
      },
    };
    const snapshot = readPrototypeSnapshot(() => storage);
    expect(reads).toBe(1);
    expect(snapshot.raw).toBe(firstRaw);
    expect(snapshot.state.theme).toBe('midnight');
  });

  it('handles the localStorage property getter throwing and preserves the current in-memory record', () => {
    const memory = memoryStorage();
    const previous = readPrototypeSnapshot(() => memory.storage);
    const denied = () => {
      throw new Error('SecurityError');
    };
    expect(readPrototypeSnapshot(denied).canSave).toBe(false);
    const draft = structuredClone(previous.state);
    draft.notes.push({ id: 'test', date: TODAY, text: '尚未保存' });
    const result = persistPrototypeSnapshot(previous, draft, denied);
    expect(result.ok).toBe(false);
    expect(result.snapshot.state).toBe(previous.state);
    expect(result.snapshot.canSave).toBe(false);
    expect(memory.writes()).toBe(0);
  });

  it('loads newer records and refuses to overwrite them from a stale tab', () => {
    const memory = memoryStorage(JSON.stringify(createInitialState()));
    const previous = readPrototypeSnapshot(() => memory.storage);
    const otherTab = structuredClone(previous.state);
    otherTab.notes.push({ id: 'other', date: TODAY, text: '其他页面保存' });
    memory.storage.setItem(STORAGE_KEY, JSON.stringify(otherTab));
    const result = persistPrototypeSnapshot(previous, previous.state, () => memory.storage);
    expect(result.ok).toBe(false);
    expect(result.snapshot.state.notes).toEqual(otherTab.notes);
    expect(memory.writes()).toBe(1);
    expect(memory.value()).toBe(JSON.stringify(otherTab));
  });

  it('checks again immediately before writing when another tab updates during validation', () => {
    const original = JSON.stringify(createInitialState());
    const otherTab = createInitialState();
    otherTab.theme = 'midnight';
    const otherRaw = JSON.stringify(otherTab);
    let raw = original;
    let reads = 0;
    let writes = 0;
    const storage: StorageLike = {
      getItem: () => {
        reads++;
        if (reads === 4) raw = otherRaw;
        return raw;
      },
      setItem: (_, value) => {
        raw = value;
        writes++;
      },
    };
    const previous = readPrototypeSnapshot(() => storage);
    const result = persistPrototypeSnapshot(previous, previous.state, () => storage);
    expect(result.ok).toBe(false);
    expect(result.snapshot.state.theme).toBe('midnight');
    expect(writes).toBe(0);
    expect(raw).toBe(otherRaw);
  });

  it('keeps the exact written comparison value when storage changes immediately after a save', () => {
    const original = JSON.stringify(createInitialState());
    const otherTab = createInitialState();
    otherTab.theme = 'midnight';
    const otherRaw = JSON.stringify(otherTab);
    let raw = original;
    let written = '';
    const storage: StorageLike = {
      getItem: () => raw,
      setItem: (_, value) => {
        written = value;
        raw = otherRaw;
      },
    };
    const previous = readPrototypeSnapshot(() => storage);
    const saved = persistPrototypeSnapshot(previous, previous.state, () => storage);
    expect(saved.ok).toBe(true);
    expect(saved.snapshot.raw).toBe(written);
    expect(saved.snapshot.raw).not.toBe(otherRaw);
    expect(persistPrototypeSnapshot(saved.snapshot, saved.snapshot.state, () => storage).ok).toBe(
      false,
    );
  });
});
