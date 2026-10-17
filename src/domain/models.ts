export type DomainId = 'body' | 'habits' | 'diet' | 'work' | 'assets';
export type View = 'overview' | DomainId;
export type RecordKind = DomainId | 'wellbeing' | 'event' | 'goal';
export interface DailyRecord {
  date: string;
  sleep: number | null;
  weight: number | null;
  steps: number | null;
  note: string;
  source?: string;
}
export interface Meal {
  id: string;
  date: string;
  meal: string;
  content: string;
  portion: string;
  calories: number | null;
  source?: string;
}
export interface FocusSession {
  id: string;
  date: string;
  title: string;
  project: string;
  minutes: number;
  source?: string;
}
export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'investment' | 'other' | 'liability';
  amount: number;
  date: string;
}
export interface Task {
  id: string;
  title: string;
  project: string;
  date: string;
  done: boolean;
  completedAt?: string;
  goalId?: string;
}
export interface Wellbeing {
  mood: string;
  energy: number;
  reason: string;
}
export interface CalendarEvent {
  id: string;
  title: string;
  kind: string;
  date: string;
  time: string;
  note: string;
  done: boolean;
}
export interface Goal {
  id: string;
  title: string;
  next: string;
  progress: number;
  due: string;
}
export interface Note {
  id: string;
  date: string;
  text: string;
}
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  artifactId?: string;
}
export interface AgentTask {
  id: string;
  title: string;
  context: string;
  status: 'running' | 'completed' | 'interrupted';
  date: string;
  artifactId?: string;
}
export interface Artifact {
  id: string;
  title: string;
  context: string;
  date: string;
  body: string;
}
export interface WorkbenchState {
  schemaVersion: 1;
  theme: 'jarvis' | 'midnight';
  range: 7 | 30;
  selected: DomainId;
  bodyMetric: 'sleep' | 'weight' | 'steps';
  context: View;
  agentTab: 'chat' | 'tasks' | 'artifacts';
  hideMoney: boolean;
  order: DomainId[];
  daily: DailyRecord[];
  meals: Meal[];
  sessions: FocusSession[];
  habits: Record<string, Record<string, boolean>>;
  accounts: Account[];
  assetHistory: { date: string; value: number }[];
  tasks: Task[];
  wellbeing: Record<string, Wellbeing>;
  events: CalendarEvent[];
  goals: Goal[];
  notes: Note[];
  messages: ChatMessage[];
  agentTasks: AgentTask[];
  artifacts: Artifact[];
  [key: string]: unknown;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type Mutate = (change: (draft: WorkbenchState) => void) => boolean;
export type DialogRequest =
  | { kind: 'record'; record: RecordKind; id?: string }
  | { kind: 'quick' | 'events' | 'goals' | 'settings' | 'sources' | 'todos' | 'notes' }
  | { kind: 'artifact'; id: string };
export interface ModuleProps {
  state: WorkbenchState;
  mutate: Mutate;
  open: (request: DialogRequest) => void;
  navigate: (view: View) => void;
  toast: (message: string) => void;
  onAgent: (context: View) => void;
}
export const DOMAINS: {
  id: DomainId;
  name: string;
  short: string;
  icon: string;
  eyebrow: string;
  title: string;
}[] = [
  {
    id: 'body',
    name: '身体状况',
    short: '身体',
    icon: 'heart',
    eyebrow: 'BODY & MIND',
    title: '身体的节奏',
  },
  {
    id: 'habits',
    name: '习惯',
    short: '习惯',
    icon: 'leaf',
    eyebrow: 'SMALL STEPS',
    title: '小习惯，慢慢积累',
  },
  {
    id: 'diet',
    name: '饮食',
    short: '饮食',
    icon: 'utensils',
    eyebrow: 'EVERYDAY NOURISHMENT',
    title: '把每一餐留下来',
  },
  {
    id: 'work',
    name: '学习 / 工作',
    short: '投入',
    icon: 'briefcase',
    eyebrow: 'FOCUS & PROGRESS',
    title: '投入与推进',
  },
  {
    id: 'assets',
    name: '资产',
    short: '资产',
    icon: 'wallet',
    eyebrow: 'A CLEARER PICTURE',
    title: '资产的全貌',
  },
];
export const HABITS = [
  { id: 'read', name: '阅读 30 分钟' },
  { id: 'move', name: '运动 30 分钟' },
  { id: 'log', name: '记录饮食' },
];
