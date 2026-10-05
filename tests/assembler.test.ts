import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PlanAssembler } from "@/lib/ai/assembler";
import { PlanSchema } from "@/lib/validation/plan";

const raw = readFileSync(new URL("./plan.fixture.ndjson", import.meta.url), "utf8");

test("assembles a streamed plan into a valid, scheduled plan", () => {
  const a = new PlanAssembler({
    planId: "00000000-0000-4000-8000-000000000009",
    prompt: "College applications",
    today: "2026-10-05",
    model: "test",
    preferences: { dailyMinutes: 60, blockedWeekdays: [] },
  });
  const stages: string[] = [];
  let tasks = 0;
  for (const line of raw.split("\n")) {
    for (const e of a.push(line)) {
      if (e.type === "stage") stages.push(e.stage);
      if (e.type === "task") tasks++;
    }
  }
  stages.push(...a.advance("finalizing").map((e) => (e.type === "stage" ? e.stage : "")));
  assert.deepEqual(stages, ["understanding", "constraints", "phases", "tasks", "dependencies", "timeline", "finalizing"]);
  const plan = PlanSchema.parse(a.finish());
  assert.equal(plan.tasks.length, tasks);
  assert.equal(plan.phases.length, 5);
  assert.equal(plan.startDate, "2026-10-05");
  const t2 = plan.tasks.find((t) => t.title.startsWith("Build a balanced"))!;
  const t1 = plan.tasks.find((t) => t.title.startsWith("Research colleges"))!;
  assert.deepEqual(t2.dependsOn, [t1.id]);
  assert.ok(plan.schedule.length > 0);
});

test("a clarify line before any plan content stops assembly", () => {
  const a = new PlanAssembler({ planId: "x", prompt: "help", today: "2026-10-05", model: "t", preferences: { dailyMinutes: 60, blockedWeekdays: [] } });
  const events = a.push('{"type":"clarify","question":"What would you like to plan?","options":["A trip"]}');
  assert.equal(events[0].type, "clarify");
  assert.equal(a.clarified, true);
  assert.throws(() => a.finish());
});
