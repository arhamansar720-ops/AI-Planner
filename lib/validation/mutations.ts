import { z } from "zod";
import {
  ConstraintsSchema,
  isoDate,
  MilestoneSchema,
  PlanSchema,
  PlanStatusSchema,
  PrioritySchema,
  ResourceSchema,
  TaskSchema,
} from "./plan";

/**
 * Every change to a plan is expressed as one of these mutations. The same
 * reducer runs optimistically in the browser and authoritatively on the
 * server, so the two can never drift apart in behaviour.
 */
export const TaskPatchSchema = TaskSchema.pick({
  title: true,
  description: true,
  notes: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  estimatedMinutes: true,
  dependsOn: true,
  subtasks: true,
  phaseId: true,
}).partial();

export const MutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task.toggle"), taskId: z.string() }),
  z.object({ type: z.literal("task.update"), taskId: z.string(), patch: TaskPatchSchema }),
  z.object({ type: z.literal("task.add"), task: TaskSchema }),
  z.object({ type: z.literal("task.delete"), taskId: z.string() }),
  z.object({ type: z.literal("task.duplicate"), taskId: z.string(), newId: z.string() }),
  z.object({ type: z.literal("task.reorder"), phaseId: z.string(), orderedIds: z.array(z.string()) }),
  z.object({ type: z.literal("subtask.toggle"), taskId: z.string(), subtaskId: z.string() }),
  z.object({
    type: z.literal("plan.update"),
    patch: z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().max(4000),
        notes: z.string().max(50000),
        priority: PrioritySchema,
        status: PlanStatusSchema,
      })
      .partial(),
  }),
  z.object({ type: z.literal("plan.constraints"), constraints: ConstraintsSchema.partial() }),
  z.object({ type: z.literal("plan.deadline"), endDate: isoDate }),
  z.object({ type: z.literal("plan.start"), startDate: isoDate }),
  z.object({ type: z.literal("plan.restore"), plan: PlanSchema }),
  z.object({
    type: z.literal("milestone.update"),
    milestoneId: z.string(),
    patch: MilestoneSchema.pick({ title: true, description: true, date: true, reached: true }).partial(),
  }),
  z.object({ type: z.literal("resource.add"), resource: ResourceSchema }),
  z.object({ type: z.literal("resource.delete"), resourceId: z.string() }),
]);

export type Mutation = z.infer<typeof MutationSchema>;
export type TaskPatch = z.infer<typeof TaskPatchSchema>;
