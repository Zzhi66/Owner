import { z } from 'zod';
import { validCalendarDate } from '../shared/date/service';

export const daySchema = z.string().refine(validCalendarDate, '日期无效');
const text = z.string();
const id = z.string().min(1);
const finite = z.number().finite();
const record = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
const source = { source: text.optional() };
const domain = z.enum(['body', 'habits', 'diet', 'work', 'assets']);
export const entitySchemas = {
  daily: record({
    date: daySchema,
    sleep: finite.min(0).max(24).nullable(),
    weight: finite.min(1).max(1000).nullable(),
    steps: finite.int().min(0).max(200000).nullable(),
    note: text,
    ...source,
  }),
  meals: record({
    id,
    date: daySchema,
    meal: text,
    content: text,
    portion: text,
    calories: finite.min(0).max(20000).nullable(),
    ...source,
  }),
  sessions: record({
    id,
    date: daySchema,
    title: text,
    project: text,
    minutes: finite.int().min(1).max(1440),
    ...source,
  }),
  accounts: record({
    id,
    name: text,
    type: z.enum(['cash', 'investment', 'other', 'liability']),
    amount: finite
      .min(0)
      .max(1e12)
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.02, '金额最多两位小数'),
    date: daySchema,
  }),
  assetHistory: record({ date: daySchema, value: finite }),
  tasks: record({
    id,
    title: text,
    project: text,
    date: daySchema,
    done: z.boolean(),
    completedAt: z.union([daySchema, z.iso.datetime()]).optional(),
    goalId: id.optional(),
  }),
  events: record({
    id,
    title: text,
    kind: text,
    date: daySchema,
    time: text.regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
    timezone: text.nullable().optional(),
    note: text,
    done: z.boolean(),
  }),
  goals: record({
    id,
    title: text,
    next: text,
    progress: finite.int().min(0).max(100),
    due: z.union([daySchema, z.literal('')]),
  }),
  notes: record({ id, date: daySchema, text }),
  messages: record({ id, role: z.enum(['user', 'assistant']), text, artifactId: id.optional() }),
  agentTasks: record({
    id,
    title: text,
    context: text,
    status: z.enum(['running', 'completed', 'interrupted']),
    runExpiresAt: z.iso.datetime().optional(),
    date: daySchema,
    artifactId: id.optional(),
  }),
  artifacts: record({ id, title: text, context: text, date: daySchema, body: text }),
};
export const wellbeingSchema = record({
  mood: text,
  energy: finite.int().min(1).max(5),
  reason: text,
});
export const habitDefinitionSchema = record({
  id,
  name: text.trim().min(1).max(100),
  periods: z
    .array(z.object({ from: daySchema, to: daySchema.optional() }))
    .superRefine((periods, context) => {
      const ordered = [...periods].sort((a, b) => a.from.localeCompare(b.from));
      ordered.forEach((period, index) => {
        const previous = ordered[index - 1];
        if (
          (period.to && period.to < period.from) ||
          (previous && (!previous.to || previous.to > period.from))
        )
          context.addIssue({ code: 'custom', message: '习惯启用日期不能交叉或倒序' });
      });
    }),
});
export const workbenchSchema = z
  .object({
    schemaVersion: z.literal(1),
    theme: z.enum(['jarvis', 'midnight']),
    range: z.union([z.literal(7), z.literal(30)]),
    selected: domain,
    bodyMetric: z.enum(['sleep', 'weight', 'steps']),
    context: z.union([z.literal('overview'), domain]),
    agentTab: z.enum(['chat', 'tasks', 'artifacts']),
    hideMoney: z.boolean(),
    order: z.array(domain),
    daily: z.array(entitySchemas.daily),
    meals: z.array(entitySchemas.meals),
    sessions: z.array(entitySchemas.sessions),
    accounts: z.array(entitySchemas.accounts),
    assetHistory: z.array(entitySchemas.assetHistory),
    tasks: z.array(entitySchemas.tasks),
    events: z.array(entitySchemas.events),
    goals: z.array(entitySchemas.goals),
    notes: z.array(entitySchemas.notes),
    messages: z.array(entitySchemas.messages),
    agentTasks: z.array(entitySchemas.agentTasks),
    artifacts: z.array(entitySchemas.artifacts),
    habits: z.record(daySchema, z.record(id, z.boolean())),
    habitDefinitions: z.array(habitDefinitionSchema).optional(),
    wellbeing: z.record(daySchema, wellbeingSchema),
  })
  .passthrough();
