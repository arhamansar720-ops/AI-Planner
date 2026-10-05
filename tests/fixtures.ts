import { normalizePlan } from "@/lib/planning/schedule";
import type { Plan } from "@/types/plan";

export const ids = {
  plan: "00000000-0000-4000-8000-000000000001",
  p1: "00000000-0000-4000-8000-0000000000a1",
  p2: "00000000-0000-4000-8000-0000000000a2",
  t1: "00000000-0000-4000-8000-0000000000b1",
  t2: "00000000-0000-4000-8000-0000000000b2",
  t3: "00000000-0000-4000-8000-0000000000b3",
  t4: "00000000-0000-4000-8000-0000000000b4",
  m1: "00000000-0000-4000-8000-0000000000c1",
};

export function samplePlan(): Plan {
  const base = (id: string, phaseId: string, title: string, start: string, due: string, deps: string[] = [], order = 0) => ({
    id, phaseId, title, description: "", notes: "", status: "todo" as const, priority: "medium" as const,
    startDate: start, dueDate: due, estimatedMinutes: 120, dependsOn: deps, subtasks: [], order,
  });
  return normalizePlan({
    id: ids.plan, title: "Sample", description: "", objective: "", prompt: "test", status: "active", priority: "high",
    startDate: "2026-10-05", endDate: "2026-10-25", assumptions: ["a"], priorities: [], nextActions: [], risks: [],
    constraints: { dailyMinutes: 60, blockedWeekdays: [], dayStartMinute: 540 }, notes: "", model: "claude-sonnet-5-5",
    phases: [
      { id: ids.p1, title: "Foundation", summary: "", startDate: "2026-10-05", endDate: "2026-10-11", order: 0 },
      { id: ids.p2, title: "Build", summary: "", startDate: "2026-10-12", endDate: "2026-10-25", order: 1 },
    ],
    tasks: [
      base(ids.t1, ids.p1, "Research", "2026-10-05", "2026-10-07", [], 0),
      base(ids.t2, ids.p1, "Shortlist", "2026-10-08", "2026-10-11", [ids.t1], 1),
      base(ids.t3, ids.p2, "Draft", "2026-10-12", "2026-10-18", [ids.t2], 0),
      base(ids.t4, ids.p2, "Finalize", "2026-10-19", "2026-10-25", [ids.t3], 1),
    ],
    milestones: [{ id: ids.m1, phaseId: ids.p1, title: "List ready", description: "", date: "2026-10-11", reached: false, order: 0 }],
    resources: [], schedule: [], createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z",
  });
}
