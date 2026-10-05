import type { Plan, Task } from "@/types/plan";
import { diffDays, formatSpan } from "./dates";

export function progress(plan: Plan) {
  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.status === "done").length;
  return { total, done, ratio: total ? done / total : 0 };
}

export function isBlocked(task: Task, plan: Plan): Task[] {
  if (task.status === "done") return [];
  return task.dependsOn
    .map((id) => plan.tasks.find((t) => t.id === id))
    .filter((t): t is Task => Boolean(t && t.status !== "done"));
}

export function isOverdue(task: Task, today: string) {
  return task.status !== "done" && task.dueDate < today;
}

/** The handful of things worth doing today, in order. */
export function focusForToday(plan: Plan, today: string, limit = 4): Task[] {
  const scheduledToday = new Set(plan.schedule.filter((s) => s.date === today).map((s) => s.taskId));
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return plan.tasks
    .filter((t) => t.status !== "done" && isBlocked(t, plan).length === 0)
    .filter((t) => scheduledToday.has(t.id) || t.dueDate < today || t.startDate <= today)
    .sort(
      (a, b) =>
        Number(scheduledToday.has(b.id)) - Number(scheduledToday.has(a.id)) ||
        a.dueDate.localeCompare(b.dueDate) ||
        rank[a.priority] - rank[b.priority],
    )
    .slice(0, limit);
}

export function planMeta(plan: Plan) {
  const statusLabel =
    plan.status === "completed" ? "Completed" : plan.status === "archived" ? "Archived" : "In progress";
  const priorityLabel = `${plan.priority[0].toUpperCase()}${plan.priority.slice(1)} priority`;
  return { span: formatSpan(plan.startDate, plan.endDate), statusLabel, priorityLabel };
}

export function daysUntil(date: string, today: string) {
  return diffDays(date, today);
}

export function weekLabel(planStart: string, start: string, end: string) {
  const a = Math.floor(diffDays(start, planStart) / 7) + 1;
  const b = Math.floor(diffDays(end, planStart) / 7) + 1;
  return a === b ? `Week ${a}` : `Week ${a}–${b}`;
}
