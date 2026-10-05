import { z } from "zod";
import { MutationSchema } from "./mutations";
import { PlanSchema } from "./plan";

export const ContextItemSchema = z.object({
  kind: z.enum(["note", "link", "file", "plan"]),
  label: z.string().trim().min(1).max(200),
  content: z.string().max(40_000),
});

export const CreatePlanRequestSchema = z.object({
  plan: PlanSchema.extend({
    phases: PlanSchema.shape.phases.min(1).max(12),
    tasks: PlanSchema.shape.tasks.min(1).max(200),
    milestones: PlanSchema.shape.milestones.max(30),
    resources: PlanSchema.shape.resources.max(30),
    schedule: PlanSchema.shape.schedule.max(5000),
  }),
});

export const MutateRequestSchema = z.object({
  mutations: z.array(MutationSchema).min(1).max(50),
});

export const RecordExchangeSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  reply: z.string().trim().min(1).max(8000),
  changes: z.array(z.string().max(200)).max(20).default([]),
});

export type ContextItemInput = z.infer<typeof ContextItemSchema>;
