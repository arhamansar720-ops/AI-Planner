import type { Constraints, Milestone, Phase, Plan, ScheduleItem, Task } from "@/types/plan";
import { addDays, diffDays, maxDate, minDate, weekday } from "./dates";

/**
 * The deterministic planning engine. The AI decides *what* needs to happen and
 * roughly *when*; this module turns that into a consistent schedule and keeps
 * it consistent whenever anything changes.
 */

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;
const MIN_SESSION = 15;
const MAX_LOOKAHEAD_DAYS = 400;

function roundUp(minutes: number, step = 5) {
  return Math.max(step, Math.ceil(minutes / step) * step);
}

function isWorkingDay(date: string, constraints: Constraints) {
  if (constraints.blockedWeekdays.length >= 7) return true;
  return !constraints.blockedWeekdays.includes(weekday(date));
}

export function sortTasks(tasks: Task[], phases: Phase[]): Task[] {
  const phaseOrder = new Map(phases.map((p) => [p.id, p.order]));
  return [...tasks].sort(
    (a, b) =>
      (phaseOrder.get(a.phaseId) ?? 0) - (phaseOrder.get(b.phaseId) ?? 0) || a.order - b.order,
  );
}

/**
 * Distribute every open task's estimated effort across working days, respecting
 * the user's daily capacity, blocked weekdays and task dependencies.
 */
export function buildSchedule(tasks: Task[], constraints: Constraints): ScheduleItem[] {
  const used = new Map<string, number>();
  const lastSessionDate = new Map<string, string>();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const items: ScheduleItem[] = [];
  const capacity = Math.max(MIN_SESSION, constraints.dailyMinutes);

  const ordered = tasks
    .filter((t) => t.status !== "done")
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.order - b.order,
    );

  for (const task of ordered) {
    let earliest = task.startDate;
    for (const depId of task.dependsOn) {
      const dep = byId.get(depId);
      if (!dep || dep.status === "done") continue;
      const depLast = lastSessionDate.get(depId);
      if (depLast) earliest = maxDate(earliest, depLast);
    }

    let remaining = roundUp(task.estimatedMinutes);
    const windowEnd = maxDate(task.dueDate, earliest);
    let workingDays = 0;
    for (let d = earliest; d <= windowEnd; d = addDays(d, 1)) {
      if (isWorkingDay(d, constraints)) workingDays++;
    }
    const target = roundUp(Math.max(MIN_SESSION, remaining / Math.max(1, workingDays)), 15);

    let date = earliest;
    for (let i = 0; remaining > 0 && i < MAX_LOOKAHEAD_DAYS; i++, date = addDays(date, 1)) {
      if (!isWorkingDay(date, constraints)) continue;
      const free = capacity - (used.get(date) ?? 0);
      if (free < Math.min(MIN_SESSION, remaining)) continue;
      // Past the due date the task is late: use whatever capacity exists.
      const want = date > task.dueDate ? remaining : Math.min(target, remaining);
      const chunk = Math.min(want, free);
      if (chunk <= 0) continue;
      const start = constraints.dayStartMinute + (used.get(date) ?? 0);
      items.push({
        id: `${task.id}:${date}`,
        taskId: task.id,
        date,
        startMinute: Math.min(start, 24 * 60 - 5),
        durationMinutes: chunk,
      });
      used.set(date, (used.get(date) ?? 0) + chunk);
      remaining -= chunk;
      lastSessionDate.set(task.id, date);
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);
}

/**
 * Recompute everything derived from tasks: phase windows, plan window,
 * milestones that sit on a phase boundary, ordering and the schedule.
 */
export function normalizePlan(plan: Plan): Plan {
  const phases = [...plan.phases]
    .sort((a, b) => a.order - b.order)
    .map((p, i) => ({ ...p, order: i }));
  const phaseIds = new Set(phases.map((p) => p.id));
  const taskIds = new Set(plan.tasks.map((t) => t.id));

  const tasks = sortTasks(
    plan.tasks
      .filter((t) => phaseIds.has(t.phaseId))
      .map((t) => ({
        ...t,
        dueDate: maxDate(t.dueDate, t.startDate),
        dependsOn: t.dependsOn.filter((d) => d !== t.id && taskIds.has(d)),
      })),
    phases,
  );

  // Re-number task order within each phase.
  const counters = new Map<string, number>();
  const orderedTasks = tasks.map((t) => {
    const n = counters.get(t.phaseId) ?? 0;
    counters.set(t.phaseId, n + 1);
    return { ...t, order: n };
  });

  const oldPhaseEnd = new Map(plan.phases.map((p) => [p.id, p.endDate]));
  const nextPhases = phases.map((p) => {
    const own = orderedTasks.filter((t) => t.phaseId === p.id);
    if (own.length === 0) return p;
    return {
      ...p,
      startDate: own.reduce((acc, t) => minDate(acc, t.startDate), own[0].startDate),
      endDate: own.reduce((acc, t) => maxDate(acc, t.dueDate), own[0].dueDate),
    };
  });
  const newPhaseEnd = new Map(nextPhases.map((p) => [p.id, p.endDate]));

  const milestones: Milestone[] = plan.milestones
    .map((m) => {
      const phaseId = m.phaseId && phaseIds.has(m.phaseId) ? m.phaseId : null;
      if (phaseId && oldPhaseEnd.get(phaseId) === m.date) {
        return { ...m, phaseId, date: newPhaseEnd.get(phaseId)! };
      }
      return { ...m, phaseId };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m, i) => ({ ...m, order: i }));

  const allStarts = [...nextPhases.map((p) => p.startDate), ...orderedTasks.map((t) => t.startDate)];
  const allEnds = [
    ...nextPhases.map((p) => p.endDate),
    ...orderedTasks.map((t) => t.dueDate),
    ...milestones.map((m) => m.date),
  ];
  const startDate = allStarts.length ? allStarts.reduce(minDate) : plan.startDate;
  const endDate = allEnds.length ? allEnds.reduce(maxDate) : plan.endDate;

  const allDone = orderedTasks.length > 0 && orderedTasks.every((t) => t.status === "done");
  const status =
    plan.status === "archived" ? "archived" : allDone ? "completed" : "active";

  return {
    ...plan,
    status,
    startDate,
    endDate: maxDate(endDate, startDate),
    phases: nextPhases,
    tasks: orderedTasks,
    milestones,
    schedule: buildSchedule(orderedTasks, plan.constraints),
  };
}

/**
 * Move a task's dates and carry the change through its dependents: anything
 * that would now start before a prerequisite finishes is pushed out, and
 * tightly chained follow-ups move together with it.
 */
export function rescheduleTask(tasks: Task[], taskId: string, startDate: string, dueDate: string): Task[] {
  const map = new Map(tasks.map((t) => [t.id, { ...t }]));
  const root = map.get(taskId);
  if (!root) return tasks;

  const previousDue = new Map<string, string>([[taskId, root.dueDate]]);
  root.startDate = startDate;
  root.dueDate = maxDate(dueDate, startDate);

  const queue = [taskId];
  let guard = 0;
  while (queue.length && guard++ < 10_000) {
    const id = queue.shift()!;
    const changed = map.get(id)!;
    const oldDue = previousDue.get(id);
    for (const t of map.values()) {
      if (!t.dependsOn.includes(id) || t.status === "done") continue;
      const required = t.dependsOn.reduce((acc, depId) => {
        const dep = map.get(depId);
        return dep ? maxDate(acc, addDays(dep.dueDate, 1)) : acc;
      }, "0000-00-00");

      let newStart = t.startDate;
      if (t.startDate < required) newStart = required;
      else if (oldDue && t.startDate === addDays(oldDue, 1)) {
        // Chained directly after the changed task — keep the chain tight.
        newStart = maxDate(addDays(changed.dueDate, 1), required);
      }
      const delta = diffDays(newStart, t.startDate);
      if (delta === 0) continue;
      previousDue.set(t.id, t.dueDate);
      t.startDate = addDays(t.startDate, delta);
      t.dueDate = addDays(t.dueDate, delta);
      queue.push(t.id);
    }
  }

  return tasks.map((t) => map.get(t.id)!);
}

/** Stretch or compress the whole plan so it ends on `endDate`. */
export function retimePlan(plan: Plan, endDate: string): Plan {
  const start = plan.startDate;
  const oldSpan = Math.max(1, diffDays(plan.endDate, start) + 1);
  const newSpan = Math.max(1, diffDays(endDate, start) + 1);
  const factor = newSpan / oldSpan;
  const scale = (d: string) => addDays(start, Math.round(diffDays(d, start) * factor));
  const scaleEnd = (d: string) => addDays(start, Math.max(0, Math.round((diffDays(d, start) + 1) * factor) - 1));

  const tasks = plan.tasks.map((t) => {
    const s = scale(t.startDate);
    return { ...t, startDate: s, dueDate: maxDate(s, scaleEnd(t.dueDate)) };
  });
  const phases = plan.phases.map((p) => ({ ...p, startDate: scale(p.startDate), endDate: scaleEnd(p.endDate) }));
  const milestones = plan.milestones.map((m) => ({ ...m, date: scaleEnd(m.date) }));
  // Phase ends are rescaled already, so avoid snapping milestones again.
  return normalizePlan({ ...plan, tasks, phases: phases, milestones, endDate });
}

/** Shift the entire plan so it begins on `startDate`. */
export function shiftPlan(plan: Plan, startDate: string): Plan {
  const delta = diffDays(startDate, plan.startDate);
  if (delta === 0) return plan;
  return normalizePlan({
    ...plan,
    startDate,
    endDate: addDays(plan.endDate, delta),
    tasks: plan.tasks.map((t) => ({ ...t, startDate: addDays(t.startDate, delta), dueDate: addDays(t.dueDate, delta) })),
    phases: plan.phases.map((p) => ({ ...p, startDate: addDays(p.startDate, delta), endDate: addDays(p.endDate, delta) })),
    milestones: plan.milestones.map((m) => ({ ...m, date: addDays(m.date, delta) })),
  });
}
