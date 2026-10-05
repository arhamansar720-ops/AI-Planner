import { z } from "zod";

/**
 * Canonical domain schemas. Everything that crosses a trust boundary
 * (database rows, API payloads, AI output after conversion) is validated
 * against these.
 */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const PrioritySchema = z.enum(["low", "medium", "high"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const PlanStatusSchema = z.enum(["active", "completed", "archived"]);
export const ResourceKindSchema = z.enum(["link", "book", "tool", "course", "person", "other"]);

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(300),
  done: z.boolean(),
});

export const TaskSchema = z.object({
  id: z.string(),
  phaseId: z.string(),
  title: z.string().min(1).max(300),
  description: z.string().max(4000),
  notes: z.string().max(10000),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  startDate: isoDate,
  dueDate: isoDate,
  estimatedMinutes: z.number().int().min(5).max(60 * 24 * 14),
  dependsOn: z.array(z.string()),
  subtasks: z.array(SubtaskSchema),
  order: z.number().int(),
});

export const PhaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000),
  startDate: isoDate,
  endDate: isoDate,
  order: z.number().int(),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  phaseId: z.string().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  date: isoDate,
  reached: z.boolean(),
  order: z.number().int(),
});

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(300),
  kind: ResourceKindSchema,
  url: z.string().max(2000).nullable(),
  note: z.string().max(2000),
  order: z.number().int(),
});

export const RiskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(300),
  mitigation: z.string().max(2000),
  likelihood: PrioritySchema,
});

export const ScheduleItemSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  date: isoDate,
  startMinute: z.number().int().min(0).max(24 * 60),
  durationMinutes: z.number().int().min(5).max(24 * 60),
});

export const ConstraintsSchema = z.object({
  /** Minutes the user can dedicate on a working day. */
  dailyMinutes: z.number().int().min(10).max(16 * 60),
  /** 0 = Sunday … 6 = Saturday. */
  blockedWeekdays: z.array(z.number().int().min(0).max(6)),
  /** Minutes after midnight that work sessions start. */
  dayStartMinute: z.number().int().min(0).max(23 * 60),
});

export const PlanSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  objective: z.string().max(4000),
  prompt: z.string().max(20000),
  status: PlanStatusSchema,
  priority: PrioritySchema,
  startDate: isoDate,
  endDate: isoDate,
  assumptions: z.array(z.string().max(1000)),
  priorities: z.array(z.string().max(1000)),
  nextActions: z.array(z.string().max(1000)),
  risks: z.array(RiskSchema),
  constraints: ConstraintsSchema,
  notes: z.string().max(50000),
  model: z.string(),
  phases: z.array(PhaseSchema),
  tasks: z.array(TaskSchema),
  milestones: z.array(MilestoneSchema),
  resources: z.array(ResourceSchema),
  schedule: z.array(ScheduleItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DEFAULT_CONSTRAINTS: z.infer<typeof ConstraintsSchema> = {
  dailyMinutes: 60,
  blockedWeekdays: [],
  dayStartMinute: 9 * 60,
};
