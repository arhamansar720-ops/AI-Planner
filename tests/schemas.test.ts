import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AssistantResponse, PlanLine } from "@/lib/ai/schemas";

const lines = readFileSync(new URL("./plan.fixture.ndjson", import.meta.url), "utf8").trim().split("\n");

test("every line of a streamed plan validates", () => {
  const types = lines.map((l) => PlanLine.parse(JSON.parse(l)).type);
  assert.equal(types[0], "meta");
  assert.equal(types.at(-1), "next");
  assert.ok(types.filter((t) => t === "task").length >= 10);
});

test("lenient fields are coerced instead of rejected", () => {
  const task = PlanLine.parse({
    type: "task",
    key: "t1",
    phase: "p1",
    title: "Draft outline",
    priority: "urgent",
    startDay: "3",
  });
  assert.equal(task.type, "task");
  if (task.type !== "task") return;
  assert.equal(task.priority, "medium");
  assert.equal(task.startDay, 3);
  assert.deepEqual(task.dependsOn, []);
});

test("malformed lines are rejected", () => {
  assert.equal(PlanLine.safeParse({ type: "task", title: "" }).success, false);
  assert.equal(PlanLine.safeParse({ type: "unknown" }).success, false);
});

test("assistant responses require every operation field", () => {
  const ok = AssistantResponse.safeParse({
    reply: "Done",
    operations: [
      {
        type: "set_daily_minutes",
        taskId: null, phaseId: null, title: null, description: null, priority: null, startDate: null,
        dueDate: null, estimatedMinutes: null, dependsOn: null, dailyMinutes: 45, blockedWeekdays: null, date: null,
      },
    ],
  });
  assert.equal(ok.success, true);
  assert.equal(AssistantResponse.safeParse({ reply: "x", operations: [{ type: "set_daily_minutes" }] }).success, false);
});
