import { DOMAINS, type StorageLike, type WorkbenchState } from '../domain/models';
import { dateOffset, uid } from '../domain/selectors';

export const TODAY = '2026-10-14';
export const STORAGE_KEY = 'owner.workbench.prototype.v1';

export function createInitialState(): WorkbenchState {
  const lastSleep = [6.6, 7.3, 7.5, 6.9, 7.1, 7.7, 7.2];
  const lastFocus = [120, 210, 168, 42, 180, 240, 150];
  const daily = Array.from({ length: 30 }, (_, index) => ({
    date: dateOffset(index - 29),
    sleep: index >= 23 ? (lastSleep[index - 23] ?? 0) : +(6.7 + (index % 6) * 0.15).toFixed(1),
    weight: +(69.4 - index * 0.035).toFixed(1),
    steps: 5600 + (index % 7) * 620,
    note: '',
    source: '示例记录',
  }));
  const meals: WorkbenchState['meals'] = [];
  for (let offset = -29; offset <= 0; offset++) {
    if (offset === -2 || offset === -5) continue;
    ['早餐', '午餐', '晚餐'].slice(0, offset === 0 ? 2 : 3).forEach((meal, index) => {
      meals.push({
        id: uid(),
        date: dateOffset(offset),
        meal,
        content: ['燕麦、牛奶、鸡蛋', '米饭、鸡肉、蔬菜', '面食、豆腐、青菜'][index] ?? '',
        portion: ['一碗 / 一杯 / 一个', '一份', '一份'][index] ?? '',
        calories: [430, 650, 560][index] ?? null,
        source: '示例记录',
      });
    });
  }
  const sessions = daily.map((entry, index) => ({
    id: uid(),
    date: entry.date,
    title: '项目整理与阅读',
    project: '个人工作台',
    minutes: index >= 23 ? (lastFocus[index - 23] ?? 0) : 80 + (index % 5) * 20,
    source: '示例记录',
  }));
  const habits = Object.fromEntries(
    daily.map((entry, index) => [
      entry.date,
      {
        read: index % 4 !== 0,
        move: index % 3 === 1,
        log: meals.some((meal) => meal.date === entry.date),
      },
    ]),
  );
  const taskTitles = [
    '梳理工作台的信息结构',
    '确定首批数据来源',
    '完成阅读笔记',
    '整理项目资料',
    '记录本周运动',
    '确认资产分类',
    '复盘时间投入',
    '整理已有账单',
    '完善界面原型',
    '整理待处理资料',
    '规划下周的工作',
    '补充今日餐食',
  ];
  return {
    schemaVersion: 1,
    theme: 'jarvis',
    range: 7,
    selected: 'body',
    bodyMetric: 'sleep',
    context: 'overview',
    agentTab: 'chat',
    hideMoney: false,
    order: ['assets', 'body', 'diet', 'work', 'habits'],
    daily,
    meals,
    sessions,
    habits,
    accounts: [
      { id: uid(), name: '日常账户', type: 'cash', amount: 40000, date: TODAY },
      { id: uid(), name: '投资账户', type: 'investment', amount: 68600, date: TODAY },
      { id: uid(), name: '其他资产', type: 'other', amount: 30000, date: TODAY },
      { id: uid(), name: '待还款项', type: 'liability', amount: 10000, date: TODAY },
    ],
    assetHistory: daily.map((entry, index) => ({
      date: entry.date,
      value: 124000 + index * 145 + ([120, -80, 170, -120][index % 4] ?? 0),
    })),
    tasks: taskTitles.map((title, index) => ({
      id: uid(),
      title,
      project: '个人工作台',
      done: index < 8,
      date: dateOffset(-index % 7),
    })),
    wellbeing: {},
    events: [],
    goals: [],
    notes: [],
    messages: [],
    agentTasks: [],
    artifacts: [],
  };
}

type DataObject = Record<string, unknown>;
const object = (value: unknown): value is DataObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const nullableNumber = (value: unknown) => value === null || number(value);
const bool = (value: unknown): value is boolean => typeof value === 'boolean';
const date = (value: unknown): value is string => {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const optional = (value: unknown, check: (value: unknown) => boolean) =>
  value === undefined || check(value);
const hasText = (value: DataObject, fields: string[]) =>
  fields.every((field) => text(value[field]));
const arrayOf = (value: unknown, check: (item: DataObject) => boolean): boolean =>
  Array.isArray(value) && value.every((item: unknown) => object(item) && check(item));
const enumValue = (value: unknown, choices: string[]) => text(value) && choices.includes(value);

function validRecords(saved: DataObject): boolean {
  return (
    saved.schemaVersion === 1 &&
    arrayOf(
      saved.daily,
      (item) =>
        date(item.date) &&
        ['sleep', 'weight', 'steps'].every((key) => nullableNumber(item[key])) &&
        text(item.note) &&
        optional(item.source, text),
    ) &&
    arrayOf(
      saved.meals,
      (item) =>
        hasText(item, ['id', 'meal', 'content', 'portion']) &&
        date(item.date) &&
        nullableNumber(item.calories) &&
        optional(item.source, text),
    ) &&
    arrayOf(
      saved.sessions,
      (item) =>
        hasText(item, ['id', 'title', 'project']) &&
        date(item.date) &&
        number(item.minutes) &&
        optional(item.source, text),
    ) &&
    arrayOf(
      saved.accounts,
      (item) =>
        hasText(item, ['id', 'name']) &&
        enumValue(item.type, ['cash', 'investment', 'other', 'liability']) &&
        number(item.amount) &&
        date(item.date),
    ) &&
    arrayOf(saved.assetHistory, (item) => date(item.date) && number(item.value)) &&
    arrayOf(
      saved.tasks,
      (item) =>
        hasText(item, ['id', 'title', 'project']) &&
        date(item.date) &&
        bool(item.done) &&
        optional(item.completedAt, date) &&
        optional(item.goalId, text),
    ) &&
    object(saved.habits) &&
    Object.entries(saved.habits).every(
      ([key, item]) => date(key) && object(item) && Object.values(item).every(bool),
    ) &&
    arrayOf(saved.notes, (item) => hasText(item, ['id', 'text']) && date(item.date)) &&
    arrayOf(
      saved.messages,
      (item) =>
        hasText(item, ['id', 'text']) &&
        enumValue(item.role, ['user', 'assistant']) &&
        optional(item.artifactId, text),
    ) &&
    arrayOf(
      saved.agentTasks,
      (item) =>
        hasText(item, ['id', 'title', 'context']) &&
        enumValue(item.status, ['running', 'completed', 'interrupted']) &&
        date(item.date) &&
        optional(item.artifactId, text),
    ) &&
    arrayOf(
      saved.artifacts,
      (item) => hasText(item, ['id', 'title', 'context', 'body']) && date(item.date),
    ) &&
    optional(
      saved.wellbeing,
      (value) =>
        object(value) &&
        Object.entries(value).every(
          ([key, item]) =>
            date(key) &&
            object(item) &&
            text(item.mood) &&
            number(item.energy) &&
            text(item.reason),
        ),
    ) &&
    optional(saved.events, (value) =>
      arrayOf(
        value,
        (item) =>
          hasText(item, ['id', 'title', 'kind', 'time', 'note']) &&
          date(item.date) &&
          bool(item.done),
      ),
    ) &&
    optional(saved.goals, (value) =>
      arrayOf(
        value,
        (item) =>
          hasText(item, ['id', 'title', 'next', 'due']) &&
          number(item.progress) &&
          (item.due === '' || date(item.due)),
      ),
    )
  );
}

function normalize(saved: DataObject): WorkbenchState {
  // Copy the complete object before normalizing preferences, retaining unknown extensions.
  const result = { ...saved } as unknown as WorkbenchState;
  result.range = saved.range === 30 ? 30 : 7;
  result.wellbeing ??= {};
  result.events ??= [];
  result.goals ??= [];
  const isDomain = (value: unknown): value is WorkbenchState['selected'] =>
    DOMAINS.some((domain) => domain.id === value);
  result.selected = isDomain(saved.selected) ? saved.selected : 'body';
  result.context =
    saved.context === 'overview' || isDomain(saved.context) ? saved.context : 'overview';
  result.theme = saved.theme === 'midnight' ? 'midnight' : 'jarvis';
  result.bodyMetric =
    saved.bodyMetric === 'weight' || saved.bodyMetric === 'steps' ? saved.bodyMetric : 'sleep';
  result.agentTab =
    saved.agentTab === 'tasks' || saved.agentTab === 'artifacts' ? saved.agentTab : 'chat';
  result.hideMoney = saved.hideMoney === true;
  const order = Array.isArray(saved.order) ? saved.order.filter(isDomain) : [];
  result.order = [...new Set([...order, ...DOMAINS.map((domain) => domain.id)])];
  if (result.order.filter((id) => id !== 'assets').join(',') === 'body,habits,diet,work') {
    result.order = ['assets', 'body', 'diet', 'work', 'habits'];
  }
  result.agentTasks = result.agentTasks.map((task) =>
    task.status === 'running' ? { ...task, status: 'interrupted' } : task,
  );
  return result;
}

export function loadPrototype(storage: StorageLike): {
  state: WorkbenchState;
  warning: string | null;
  canSave: boolean;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: createInitialState(), warning: null, canSave: true };
    const saved: unknown = JSON.parse(raw);
    if (!object(saved) || !validRecords(saved)) {
      return {
        state: createInitialState(),
        warning: '本地记录格式或版本不受支持，原始内容已保留。当前仅展示示例，暂停写入。',
        canSave: false,
      };
    }
    return { state: normalize(saved), warning: null, canSave: true };
  } catch {
    return {
      state: createInitialState(),
      warning: '无法读取本地记录，原始内容已保留。当前仅展示示例，暂停写入。',
      canSave: false,
    };
  }
}

export function savePrototype(
  storage: StorageLike,
  state: WorkbenchState,
): { ok: boolean; error: string | null } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    const stored: unknown = raw === null ? {} : JSON.parse(raw);
    if (!object(stored) || (raw !== null && !validRecords(stored))) {
      return { ok: false, error: '现有本地记录无法安全识别，已停止保存并保留原始内容。' };
    }
    if (!validRecords(state)) return { ok: false, error: '记录格式不完整，未写入本地存储。' };
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, ...state }));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: '本地保存失败，原有记录仍保留；请先导出当前记录。' };
  }
}
