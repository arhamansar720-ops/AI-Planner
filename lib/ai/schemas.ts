import { z } from "zod";

/**
 * Schemas for what the model emits. Plan generation streams one JSON object
 * per line (NDJSON) so the UI can render each phase, task and milestone the
 * moment it exists. Every line is validated independently.
 *
 * The model works in day offsets ("day 0 = today") rather than calendar
 * dates; the server converts offsets into dates, which keeps date arithmetic
 * out of the model's hands.
 */

const text = (max: number) => z.string().trim().max(max);
const priority = z.enum(["low", "medium", "high"]).catch("medium");
const day = z.coerce.number().int().min(0).max(1500);

export const MetaLine = z.object({
  type: z.literal("meta"),
  title: text(120).min(1),
  description: text(600).default(""),
  objective: text(600).default(""),
  priority,
  durationDays: z.coerce.number().int().min(1).max(1500),
  assumptions: z.array(text(300)).max(8).default([]),
  priorities: z.array(text(300)).max(6).default([]),
  constraints: z
    .object({
      dailyMinutes: z.coerce.number().int().min(10).max(960).optional(),
      blockedWeekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    })
    .partial()
    .default({}),
});

export const PhaseLine = z.object({
  type: z.literal("phase"),
  key: text(40).min(1),
  title: text(120).min(1),
  summary: text(600).default(""),
  startDay: day,
  endDay: day,
});

export const TaskLine = z.object({
  type: z.literal("task"),
  key: text(40).min(1),
  phase: text(40).min(1),
  title: text(200).min(1),
  description: text(1200).default(""),
  priority,
  startDay: day,
  durationDays: z.coerce.number().int().min(1).max(365).default(1),
  estimatedMinutes: z.coerce.number().int().min(5).max(6000).default(60),
  dependsOn: z.array(text(40)).max(10).default([]),
  subtasks: z.array(text(200)).max(8).default([]),
});

export const MilestoneLine = z.object({
  type: z.literal("milestone"),
  key: text(40).default(""),
  phase: text(40).nullable().optional(),
  title: text(160).min(1),
  description: text(600).default(""),
  day,
});

export const RiskLine = z.object({
  type: z.literal("risk"),
  title: text(200).min(1),
  mitigation: text(600).default(""),
  likelihood: priority,
});

export const ResourceLine = z.object({
  type: z.literal("resource"),
  title: text(200).min(1),
  kind: z.enum(["link", "book", "tool", "course", "person", "other"]).catch("other"),
  url: z.string().trim().url().max(2000).nullable().optional().catch(null),
  note: text(400).default(""),
});

export const NextLine = z.object({
  type: z.literal("next"),
  actions: z.array(text(300)).min(1).max(5),
});

export const ClarifyLine = z.object({
  type: z.literal("clarify"),
  question: text(300).min(1),
  options: z.array(text(80)).max(4).default([]),
});

export const PlanLine = z.discriminatedUnion("type", [
  MetaLine,
  PhaseLine,
  TaskLine,
  MilestoneLine,
  RiskLine,
  ResourceLine,
  NextLine,
  ClarifyLine,
]);

export type PlanLine = z.infer<typeof PlanLine>;

/* ------------------------------------------------------------------------ */
/* Assistant                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * The assistant answers with a reply plus a list of concrete operations that
 * the server applies to the plan. Fields are nullable rather than optional so
 * the schema is friendly to structured outputs.
 */
export const AssistantOperation = z.object({
  type: z.enum([
    "update_task",
    "add_task",
    "delete_task",
    "complete_task",
    "set_daily_minutes",
    "set_blocked_weekdays",
    "set_deadline",
    "set_start_date",
    "update_plan",
  ]),
  taskId: z.string().nullable(),
  phaseId: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]).nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  estimatedMinutes: z.number().nullable(),
  dependsOn: z.array(z.string()).nullable(),
  dailyMinutes: z.number().nullable(),
  blockedWeekdays: z.array(z.number()).nullable(),
  date: z.string().nullable(),
});

export const AssistantResponse = z.object({
  reply: z.string(),
  operations: z.array(AssistantOperation),
});

export type AssistantOperation = z.infer<typeof AssistantOperation>;
export type AssistantResponse = z.infer<typeof AssistantResponse>;
