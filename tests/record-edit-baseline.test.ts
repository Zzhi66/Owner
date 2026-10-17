import { describe, expect, it } from 'vitest';
import { createInitialState, STORAGE_KEY, TODAY } from '../src/data/prototype';
import { persistPrototypeSnapshot, readPrototypeSnapshot } from '../src/data/prototype-session';
import {
  assertRecordEditBaseline,
  captureRecordEditBaseline,
  matchesRecordEditBaseline,
  RECORD_EDIT_CONFLICT,
} from '../src/domain/record-edit-baseline';
import type { RecordEditTarget } from '../src/domain/record-edit-baseline';
import type { StorageLike, WorkbenchState } from '../src/domain/models';
import { dateOffset } from '../src/domain/selectors';

function fixture() {
  const state = createInitialState();
  state.wellbeing[TODAY] = { mood: '平静', energy: 3, reason: '原记录' };
  state.events = [
    { id: 'event', title: '原日程', kind: '日程', date: TODAY, time: '', note: '', done: false },
  ];
  state.goals = [{ id: 'goal', title: '原目标', next: '原下一步', progress: 10, due: '' }];
  state.habits[TODAY] = { read: false, move: false, log: false };
  return state;
}

function sharedStorage(state = fixture()) {
  let raw = JSON.stringify(state);
  let writes = 0;
  const storage: StorageLike = {
    getItem: () => raw,
    setItem: (key, value) => {
      if (key === STORAGE_KEY) {
        raw = value;
        writes++;
      }
    },
  };
  return { storage, raw: () => raw, writes: () => writes };
}

type Scenario = {
  label: string;
  target: RecordEditTarget;
  otherPage: (state: WorkbenchState) => void;
};
const conflicts: Scenario[] = [
  {
    label: '身体数据被修改',
    target: { kind: 'body', date: TODAY },
    otherPage: (state) => {
      const day = state.daily.find((item) => item.date === TODAY);
      if (day) day.sleep = 8;
    },
  },
  {
    label: '身体数据被删除',
    target: { kind: 'body', date: TODAY },
    otherPage: (state) => {
      state.daily = state.daily.filter((item) => item.date !== TODAY);
    },
  },
  {
    label: '心情被修改',
    target: { kind: 'wellbeing', date: TODAY },
    otherPage: (state) => {
      state.wellbeing[TODAY] = { mood: '愉快', energy: 5, reason: '其他页面' };
    },
  },
  {
    label: '心情被删除',
    target: { kind: 'wellbeing', date: TODAY },
    otherPage: (state) => {
      delete state.wellbeing[TODAY];
    },
  },
  {
    label: '日程被改期',
    target: { kind: 'event', id: 'event' },
    otherPage: (state) => {
      const event = state.events[0];
      if (event) event.date = dateOffset(1);
    },
  },
  {
    label: '日程被删除',
    target: { kind: 'event', id: 'event' },
    otherPage: (state) => {
      state.events = [];
    },
  },
  {
    label: '目标被修改',
    target: { kind: 'goal', id: 'goal' },
    otherPage: (state) => {
      const goal = state.goals[0];
      if (goal) goal.progress = 80;
    },
  },
  {
    label: '目标被删除',
    target: { kind: 'goal', id: 'goal' },
    otherPage: (state) => {
      state.goals = [];
    },
  },
  {
    label: '账户余额被修改',
    target: { kind: 'assets', name: '日常账户', type: 'cash' },
    otherPage: (state) => {
      const account = state.accounts.find((item) => item.name === '日常账户');
      if (account) account.amount = 123;
    },
  },
  {
    label: '账户被删除',
    target: { kind: 'assets', name: '日常账户', type: 'cash' },
    otherPage: (state) => {
      state.accounts = state.accounts.filter((item) => item.name !== '日常账户');
    },
  },
  {
    label: '同名同类账户被新增',
    target: { kind: 'assets', name: '新增账户', type: 'cash' },
    otherPage: (state) => {
      state.accounts.push({
        id: 'new-account',
        name: '新增账户',
        type: 'cash',
        amount: 100,
        date: TODAY,
      });
    },
  },
  {
    label: '同一天同一习惯被修改',
    target: { kind: 'habits', date: TODAY, habit: 'read' },
    otherPage: (state) => {
      state.habits[TODAY] = { ...state.habits[TODAY], read: true };
    },
  },
];

describe('editor records after another tab has already synchronized', () => {
  it.each(conflicts)(
    '$label时，旧草稿不能因新 storage 快照而获得写入权限',
    ({ target, otherPage }) => {
      const shared = sharedStorage();
      const provider = () => shared.storage;
      const editorOpened = readPrototypeSnapshot(provider);
      const baseline = captureRecordEditBaseline(editorOpened.state);
      const userDraft = { text: '仍在编辑的未保存内容' };
      const other = readPrototypeSnapshot(provider);
      const changed = structuredClone(other.state);
      otherPage(changed);
      expect(persistPrototypeSnapshot(other, changed, provider).ok).toBe(true);
      // This is the hook's storage-event path: its current snapshot now matches the other tab.
      const synchronized = readPrototypeSnapshot(provider);
      const rawAfterOtherPage = shared.raw();
      const writesAfterOtherPage = shared.writes();
      const saveFromEditor = () => {
        const next = structuredClone(synchronized.state);
        assertRecordEditBaseline(baseline, next, target);
        next.notes.push({ id: 'should-not-save', date: TODAY, text: userDraft.text });
        return persistPrototypeSnapshot(synchronized, next, provider);
      };
      expect(saveFromEditor).toThrow(RECORD_EDIT_CONFLICT);
      expect(shared.raw()).toBe(rawAfterOtherPage);
      expect(shared.writes()).toBe(writesAfterOtherPage);
      expect(userDraft.text).toBe('仍在编辑的未保存内容');
    },
  );

  it.each(['wellbeing', 'event', 'goal'] as const)(
    '%s 删除操作也拒绝删除另一个页面刚修改的记录',
    (kind) => {
      const shared = sharedStorage();
      const provider = () => shared.storage;
      const opened = readPrototypeSnapshot(provider);
      const baseline = captureRecordEditBaseline(opened.state);
      const target: RecordEditTarget =
        kind === 'wellbeing' ? { kind, date: TODAY } : { kind, id: kind };
      const other = structuredClone(opened.state);
      if (kind === 'wellbeing')
        other.wellbeing[TODAY] = { mood: '愉快', energy: 5, reason: '他页修改' };
      if (kind === 'event' && other.events[0]) other.events[0].title = '他页修改';
      if (kind === 'goal' && other.goals[0]) other.goals[0].title = '他页修改';
      expect(persistPrototypeSnapshot(opened, other, provider).ok).toBe(true);
      const synced = readPrototypeSnapshot(provider);
      const remove = () => {
        const next = structuredClone(synced.state);
        assertRecordEditBaseline(baseline, next, target);
        if (kind === 'wellbeing') delete next.wellbeing[TODAY];
        if (kind === 'event') next.events = [];
        if (kind === 'goal') next.goals = [];
        return persistPrototypeSnapshot(synced, next, provider);
      };
      expect(remove).toThrow(RECORD_EDIT_CONFLICT);
      expect(shared.raw()).toBe(JSON.stringify(other));
    },
  );

  it('allows unrelated records and preferences to change, then preserves them on a valid edit', () => {
    const shared = sharedStorage();
    const provider = () => shared.storage;
    const opened = readPrototypeSnapshot(provider);
    const baseline = captureRecordEditBaseline(opened.state);
    const other = structuredClone(opened.state);
    other.theme = 'midnight';
    other.hideMoney = true;
    const olderDay = other.daily.find((item) => item.date === dateOffset(-1));
    if (olderDay) olderDay.note = '另一天的记录';
    other.habits[TODAY] = { ...other.habits[TODAY], move: true };
    other.accounts.push({
      id: 'separate',
      name: '另一账户',
      type: 'cash',
      amount: 321,
      date: TODAY,
    });
    other.events.push({
      id: 'separate',
      title: '另一日程',
      kind: '会议',
      date: TODAY,
      time: '',
      note: '',
      done: false,
    });
    expect(persistPrototypeSnapshot(opened, other, provider).ok).toBe(true);
    const synced = readPrototypeSnapshot(provider);
    const targets: RecordEditTarget[] = [
      { kind: 'body', date: TODAY },
      { kind: 'wellbeing', date: TODAY },
      { kind: 'event', id: 'event' },
      { kind: 'goal', id: 'goal' },
      { kind: 'assets', name: '日常账户', type: 'cash' },
      { kind: 'habits', date: TODAY, habit: 'read' },
      { kind: 'diet' },
      { kind: 'work' },
    ];
    targets.forEach((target) =>
      expect(matchesRecordEditBaseline(baseline, synced.state, target)).toBe(true),
    );
    const edited = structuredClone(synced.state);
    assertRecordEditBaseline(baseline, edited, { kind: 'event', id: 'event' });
    const event = edited.events.find((item) => item.id === 'event');
    if (event) event.title = '我的编辑';
    expect(persistPrototypeSnapshot(synced, edited, provider).ok).toBe(true);
    const final = readPrototypeSnapshot(provider).state;
    expect(final.theme).toBe('midnight');
    expect(final.accounts.find((item) => item.id === 'separate')?.amount).toBe(321);
    expect(final.events.find((item) => item.id === 'separate')?.title).toBe('另一日程');
    expect(final.events.find((item) => item.id === 'event')?.title).toBe('我的编辑');
  });

  it('reloads daily baselines when switching dates and rejects later changes to the newly loaded day', () => {
    const state = fixture();
    const opened = captureRecordEditBaseline(state);
    const today: RecordEditTarget = { kind: 'body', date: TODAY };
    const yesterday: RecordEditTarget = { kind: 'body', date: dateOffset(-1) };
    const todayRecord = state.daily.find((item) => item.date === TODAY);
    if (todayRecord) todayRecord.sleep = 9;
    expect(matchesRecordEditBaseline(opened, state, today)).toBe(false);
    const switchedDate = captureRecordEditBaseline(state);
    expect(matchesRecordEditBaseline(switchedDate, state, yesterday)).toBe(true);
    const yesterdayRecord = state.daily.find((item) => item.date === dateOffset(-1));
    if (yesterdayRecord) yesterdayRecord.sleep = 9;
    expect(matchesRecordEditBaseline(switchedDate, state, yesterday)).toBe(false);
    const reopenedToday = captureRecordEditBaseline(state);
    expect(matchesRecordEditBaseline(reopenedToday, state, today)).toBe(true);
    const wellbeingTarget: RecordEditTarget = { kind: 'wellbeing', date: dateOffset(-1) };
    const switchedFeeling = captureRecordEditBaseline(state);
    state.wellbeing[dateOffset(-1)] = { mood: '愉快', energy: 4, reason: '刚新增' };
    expect(matchesRecordEditBaseline(switchedFeeling, state, wellbeingTarget)).toBe(false);
    expect(
      matchesRecordEditBaseline(captureRecordEditBaseline(state), state, wellbeingTarget),
    ).toBe(true);
  });

  it('matches accounts by both name and type, and does not confuse unrelated same-name accounts', () => {
    const state = fixture();
    const baseline = captureRecordEditBaseline(state);
    state.accounts.push({
      id: 'same-name',
      name: '日常账户',
      type: 'investment',
      amount: 2,
      date: TODAY,
    });
    expect(
      matchesRecordEditBaseline(baseline, state, {
        kind: 'assets',
        name: '日常账户',
        type: 'cash',
      }),
    ).toBe(true);
    expect(
      matchesRecordEditBaseline(baseline, state, {
        kind: 'assets',
        name: '日常账户',
        type: 'investment',
      }),
    ).toBe(false);
  });

  it('compares values rather than object property order and never allows a missing ID to be resurrected', () => {
    const state = fixture();
    const baseline = captureRecordEditBaseline(state);
    state.wellbeing[TODAY] = { reason: '原记录', energy: 3, mood: '平静' };
    expect(matchesRecordEditBaseline(baseline, state, { kind: 'wellbeing', date: TODAY })).toBe(
      true,
    );
    expect(matchesRecordEditBaseline(baseline, state, { kind: 'event', id: 'never-existed' })).toBe(
      false,
    );
    expect(matchesRecordEditBaseline(baseline, state, { kind: 'goal', id: 'never-existed' })).toBe(
      false,
    );
    expect(matchesRecordEditBaseline(baseline, state, { kind: 'event' })).toBe(true);
    expect(matchesRecordEditBaseline(baseline, state, { kind: 'goal' })).toBe(true);
  });
});
