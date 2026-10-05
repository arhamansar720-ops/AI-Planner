import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMutation } from "@/lib/planning/mutations";
import { buildSchedule } from "@/lib/planning/schedule";
import { PlanSchema } from "@/lib/validation/plan";
import { weekday } from "@/lib/planning/dates";
import { ids, samplePlan } from "./fixtures";

test("sample plan is valid and scheduled within capacity", () => {
  const plan = samplePlan();
  PlanSchema.parse(plan);
  const perDay = new Map<string, number>();
  for (const s of plan.schedule) perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.durationMinutes);
  for (const [, m] of perDay) assert.ok(m <= 60);
  for (const t of plan.tasks) {
    const total = plan.schedule.filter((s) => s.taskId === t.id).reduce((a, s) => a + s.durationMinutes, 0);
    assert.equal(total, 120, t.title);
  }
});

test("schedule respects dependencies", () => {
  const plan = samplePlan();
  const last = (id: string) => plan.schedule.filter((s) => s.taskId === id).map((s) => s.date).sort().at(-1)!;
  const first = (id: string) => plan.schedule.filter((s) => s.taskId === id).map((s) => s.date).sort()[0];
  assert.ok(first(ids.t2) >= last(ids.t1));
  assert.ok(first(ids.t3) >= last(ids.t2));
});

test("blocked weekdays are never scheduled", () => {
  const plan = applyMutation(samplePlan(), { type: "plan.constraints", constraints: { blockedWeekdays: [5, 6, 0] } });
  assert.ok(plan.schedule.length > 0);
  for (const s of plan.schedule) assert.ok(![5, 6, 0].includes(weekday(s.date)), s.date);
});

test("moving a deadline pushes dependents and keeps chains", () => {
  const plan = applyMutation(samplePlan(), { type: "task.update", taskId: ids.t2, patch: { dueDate: "2026-10-15" } });
  const t3 = plan.tasks.find((t) => t.id === ids.t3)!;
  const t4 = plan.tasks.find((t) => t.id === ids.t4)!;
  assert.equal(t3.startDate, "2026-10-16");
  assert.equal(t3.dueDate, "2026-10-22");
  assert.equal(t4.startDate, "2026-10-23");
  // Milestone on phase end follows the phase.
  assert.equal(plan.milestones[0].date, "2026-10-15");
  assert.equal(plan.endDate, "2026-10-29");
});

test("pulling a task earlier pulls its tight chain", () => {
  const plan = applyMutation(samplePlan(), { type: "task.update", taskId: ids.t1, patch: { dueDate: "2026-10-06" } });
  assert.equal(plan.tasks.find((t) => t.id === ids.t2)!.startDate, "2026-10-07");
});

test("deadline retime compresses the plan", () => {
  const plan = applyMutation(samplePlan(), { type: "plan.deadline", endDate: "2026-10-15" });
  assert.equal(plan.endDate <= "2026-10-15", true);
  for (const t of plan.tasks) assert.ok(t.dueDate >= t.startDate);
  PlanSchema.parse(plan);
});

test("delete removes dependency references, duplicate inserts after", () => {
  let plan = applyMutation(samplePlan(), { type: "task.delete", taskId: ids.t2 });
  assert.deepEqual(plan.tasks.find((t) => t.id === ids.t3)!.dependsOn, []);
  plan = applyMutation(plan, { type: "task.duplicate", taskId: ids.t1, newId: "dup" });
  const p1 = plan.tasks.filter((t) => t.phaseId === ids.p1).map((t) => t.id);
  assert.deepEqual(p1, [ids.t1, "dup"]);
});

test("toggling all tasks completes the plan", () => {
  let plan = samplePlan();
  for (const t of plan.tasks) plan = applyMutation(plan, { type: "task.toggle", taskId: t.id });
  assert.equal(plan.status, "completed");
  assert.equal(plan.schedule.length, 0);
});

test("over-capacity work spills past the due date instead of vanishing", () => {
  const plan = samplePlan();
  const items = buildSchedule(plan.tasks.map((t) => ({ ...t, estimatedMinutes: 600 })), plan.constraints);
  const total = items.reduce((a, s) => a + s.durationMinutes, 0);
  assert.equal(total, 2400);
});
