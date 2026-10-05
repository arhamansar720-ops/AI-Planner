import type { z } from "zod";
import type {
  ConstraintsSchema,
  MilestoneSchema,
  PhaseSchema,
  PlanSchema,
  PlanStatusSchema,
  PrioritySchema,
  ResourceKindSchema,
  ResourceSchema,
  RiskSchema,
  ScheduleItemSchema,
  SubtaskSchema,
  TaskSchema,
  TaskStatusSchema,
} from "@/lib/validation/plan";

export type Priority = z.infer<typeof PrioritySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
export type ResourceKind = z.infer<typeof ResourceKindSchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export type PlanSummary = {
  id: string;
  title: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  taskCount: number;
  doneCount: number;
};

/** A plan as it is being assembled during generation. */
export type DraftPlan = {
  meta: Pick<
    Plan,
    "title" | "description" | "objective" | "priority" | "startDate" | "endDate" | "assumptions" | "priorities"
  > | null;
  phases: Phase[];
  tasks: Task[];
  milestones: Milestone[];
  risks: Risk[];
  resources: Resource[];
  nextActions: string[];
};
