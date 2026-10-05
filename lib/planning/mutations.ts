import type { Mutation } from "@/lib/validation/mutations";
import type { Plan, Task } from "@/types/plan";
import { addDays, diffDays, maxDate } from "./dates";
import { normalizePlan, rescheduleTask, retimePlan, shiftPlan } from "./schedule";

const now = () => new Date().toISOString();

function touch(plan: Plan): Plan {
  return { ...plan, updatedAt: now() };
}

function updateTask(plan: Plan, taskId: string, fn: (t: Task) => Task): Plan {
  return { ...plan, tasks: plan.tasks.map((t) => (t.id === taskId ? fn(t) : t)) };
}

/**
 * Pure reducer applying a mutation to a plan. Throws on references to
 * entities that don't exist so the API can reject bad requests.
 */
export function applyMutation(plan: Plan, mutation: Mutation): Plan {
  switch (mutation.type) {
    case "task.toggle": {
      const task = plan.tasks.find((t) => t.id === mutation.taskId);
      if (!task) throw new MutationError("Task not found");
      const status = task.status === "done" ? "todo" : "done";
      return touch(
        normalizePlan(
          updateTask(plan, task.id, (t) => ({
            ...t,
            status,
            subtasks: status === "done" ? t.subtasks.map((s) => ({ ...s, done: true })) : t.subtasks,
          })),
        ),
      );
    }

    case "task.update": {
      const task = plan.tasks.find((t) => t.id === mutation.taskId);
      if (!task) throw new MutationError("Task not found");
      const { startDate, dueDate, ...rest } = mutation.patch;
      if (rest.phaseId && !plan.phases.some((p) => p.id === rest.phaseId)) {
        throw new MutationError("Phase not found");
      }
      let next = updateTask(plan, task.id, (t) => ({ ...t, ...rest }));
      if (startDate !== undefined || dueDate !== undefined) {
        let s = startDate ?? task.startDate;
        let d = dueDate ?? task.dueDate;
        // Changing only the start keeps the duration; changing only the end stretches.
        if (startDate !== undefined && dueDate === undefined) {
          d = addDays(s, diffDays(task.dueDate, task.startDate));
        }
        if (d < s) s = d;
        next = { ...next, tasks: rescheduleTask(next.tasks, task.id, s, d) };
      }
      return touch(normalizePlan(next));
    }

    case "task.add": {
      if (!plan.phases.some((p) => p.id === mutation.task.phaseId)) {
        throw new MutationError("Phase not found");
      }
      if (plan.tasks.some((t) => t.id === mutation.task.id)) throw new MutationError("Duplicate task");
      const order = plan.tasks.filter((t) => t.phaseId === mutation.task.phaseId).length;
      return touch(
        normalizePlan({
          ...plan,
          tasks: [...plan.tasks, { ...mutation.task, order: mutation.task.order ?? order }],
        }),
      );
    }

    case "task.delete": {
      if (!plan.tasks.some((t) => t.id === mutation.taskId)) throw new MutationError("Task not found");
      return touch(
        normalizePlan({
          ...plan,
          tasks: plan.tasks
            .filter((t) => t.id !== mutation.taskId)
            .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== mutation.taskId) })),
        }),
      );
    }

    case "task.duplicate": {
      const task = plan.tasks.find((t) => t.id === mutation.taskId);
      if (!task) throw new MutationError("Task not found");
      if (plan.tasks.some((t) => t.id === mutation.newId)) throw new MutationError("Duplicate task");
      const copy: Task = {
        ...task,
        id: mutation.newId,
        title: `${task.title} (copy)`.slice(0, 300),
        status: "todo",
        order: task.order + 0.5,
        subtasks: task.subtasks.map((s, i) => ({ ...s, id: `${mutation.newId}-s${i}`, done: false })),
      };
      // Insert right after the original by giving it a fractional order; normalize re-numbers.
      return touch(normalizePlan({ ...plan, tasks: [...plan.tasks, copy as Task] }));
    }

    case "task.reorder": {
      const position = new Map(mutation.orderedIds.map((id, i) => [id, i]));
      return touch(
        normalizePlan({
          ...plan,
          tasks: plan.tasks.map((t) =>
            t.phaseId === mutation.phaseId && position.has(t.id) ? { ...t, order: position.get(t.id)! } : t,
          ),
        }),
      );
    }

    case "subtask.toggle": {
      const task = plan.tasks.find((t) => t.id === mutation.taskId);
      if (!task) throw new MutationError("Task not found");
      return touch(
        updateTask(plan, task.id, (t) => ({
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === mutation.subtaskId ? { ...s, done: !s.done } : s)),
        })),
      );
    }

    case "plan.update": {
      return touch({ ...plan, ...mutation.patch });
    }

    case "plan.constraints":
      return touch(
        normalizePlan({ ...plan, constraints: { ...plan.constraints, ...mutation.constraints } }),
      );

    case "plan.deadline": {
      if (mutation.endDate <= plan.startDate) throw new MutationError("Deadline must be after the start date");
      return touch(retimePlan(plan, mutation.endDate));
    }

    case "plan.start":
      return touch(shiftPlan(plan, mutation.startDate));

    case "plan.restore":
      if (mutation.plan.id !== plan.id) throw new MutationError("Plan mismatch");
      return touch(normalizePlan({ ...mutation.plan, createdAt: plan.createdAt, prompt: plan.prompt }));

    case "milestone.update": {
      if (!plan.milestones.some((m) => m.id === mutation.milestoneId)) {
        throw new MutationError("Milestone not found");
      }
      return touch({
        ...plan,
        milestones: plan.milestones.map((m) =>
          m.id === mutation.milestoneId ? { ...m, ...mutation.patch } : m,
        ),
      });
    }

    case "resource.add":
      return touch({
        ...plan,
        resources: [...plan.resources, { ...mutation.resource, order: plan.resources.length }],
      });

    case "resource.delete":
      return touch({ ...plan, resources: plan.resources.filter((r) => r.id !== mutation.resourceId) });
  }
}

export class MutationError extends Error {}

/** Convenience: build a fresh task in a phase with sensible defaults. */
export function createBlankTask(plan: Plan, phaseId: string, id: string, title = "New task"): Task {
  const phase = plan.phases.find((p) => p.id === phaseId);
  const start = phase ? maxDate(phase.startDate, plan.startDate) : plan.startDate;
  return {
    id,
    phaseId,
    title,
    description: "",
    notes: "",
    status: "todo",
    priority: "medium",
    startDate: start,
    dueDate: phase ? phase.endDate : addDays(start, 2),
    estimatedMinutes: 60,
    dependsOn: [],
    subtasks: [],
    order: plan.tasks.filter((t) => t.phaseId === phaseId).length,
  };
}
