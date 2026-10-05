import { addDays, maxDate } from "@/lib/planning/dates";
import { normalizePlan } from "@/lib/planning/schedule";
import { STAGES, stageIndex, type StageId } from "@/lib/planning/stages";
import { PlanSchema } from "@/lib/validation/plan";
import type { Milestone, Phase, Plan, Resource, Risk, Task } from "@/types/plan";
import type { PlannerPreferences } from "./prompts";
import { PlanLine } from "./schemas";

export type AssemblerEvent =
  | { type: "stage"; stage: StageId }
  | {
      type: "meta";
      meta: Pick<Plan, "title" | "description" | "objective" | "priority" | "startDate" | "endDate" | "assumptions" | "priorities">;
    }
  | { type: "phase"; phase: Phase }
  | { type: "task"; task: Task }
  | { type: "milestone"; milestone: Milestone }
  | { type: "risk"; risk: Risk }
  | { type: "resource"; resource: Resource }
  | { type: "next"; actions: string[] }
  | { type: "clarify"; question: string; options: string[] };

const uuid = () => crypto.randomUUID();

/**
 * Turns the model's NDJSON plan, one line at a time, into validated domain
 * entities (day offsets become calendar dates, keys become ids) and the
 * planning stage each line represents. Runtime-agnostic: the server route
 * and any browser client share it.
 */
export class PlanAssembler {
  private stage = -1;
  private phaseKeys = new Map<string, string>();
  private taskKeys = new Map<string, string>();
  private phases: Phase[] = [];
  private tasks: Task[] = [];
  private milestones: Milestone[] = [];
  private risks: Risk[] = [];
  private resources: Resource[] = [];
  private nextActions: string[] = [];
  private meta: Extract<PlanLine, { type: "meta" }> | null = null;
  clarified = false;

  constructor(
    private readonly input: {
      planId: string;
      prompt: string;
      today: string;
      model: string;
      preferences: Pick<PlannerPreferences, "dailyMinutes" | "blockedWeekdays">;
    },
  ) {}

  /** Advance to a stage, emitting every stage passed on the way. */
  advance(to: StageId): AssemblerEvent[] {
    const out: AssemblerEvent[] = [];
    const target = stageIndex(to);
    while (this.stage < target) {
      this.stage++;
      out.push({ type: "stage", stage: STAGES[this.stage].id });
    }
    return out;
  }

  get hasContent() {
    return this.meta !== null && this.tasks.length > 0;
  }

  /** Parse one line of model output. Malformed lines are skipped. */
  push(raw: string): AssemblerEvent[] {
    const line = raw.trim();
    if (!line.startsWith("{")) return [];
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      console.warn("[planner] skipped malformed line", line.slice(0, 200));
      return [];
    }
    const parsed = PlanLine.safeParse(json);
    if (!parsed.success) {
      console.warn("[planner] skipped invalid line", parsed.error.issues[0]?.message, line.slice(0, 200));
      return [];
    }
    const data = parsed.data;
    const { today } = this.input;

    switch (data.type) {
      case "clarify":
        if (this.phases.length || this.tasks.length) return [];
        this.clarified = true;
        return [{ type: "clarify", question: data.question, options: data.options }];

      case "meta": {
        if (this.meta) return [];
        this.meta = data;
        return [
          ...this.advance("constraints"),
          {
            type: "meta",
            meta: {
              title: data.title,
              description: data.description,
              objective: data.objective,
              priority: data.priority,
              startDate: today,
              endDate: addDays(today, data.durationDays - 1),
              assumptions: data.assumptions,
              priorities: data.priorities,
            },
          },
          ...this.advance("phases"),
        ];
      }

      case "phase": {
        const id = uuid();
        this.phaseKeys.set(data.key, id);
        const phase: Phase = {
          id,
          title: data.title,
          summary: data.summary,
          startDate: addDays(today, data.startDay),
          endDate: addDays(today, Math.max(data.endDay, data.startDay)),
          order: this.phases.length,
        };
        this.phases.push(phase);
        return [...this.advance("phases"), { type: "phase", phase }];
      }

      case "task": {
        const out: AssemblerEvent[] = [];
        let phaseId = this.phaseKeys.get(data.phase);
        if (!phaseId) {
          // A task before any phase: give it a phase to live in.
          if (!this.phases.length) {
            const phase: Phase = {
              id: uuid(),
              title: "Getting started",
              summary: "",
              startDate: today,
              endDate: addDays(today, 6),
              order: 0,
            };
            this.phases.push(phase);
            this.phaseKeys.set(data.phase, phase.id);
            out.push({ type: "phase", phase });
          }
          phaseId = this.phases[this.phases.length - 1].id;
        }
        const id = uuid();
        this.taskKeys.set(data.key, id);
        const startDate = addDays(today, data.startDay);
        const task: Task = {
          id,
          phaseId,
          title: data.title,
          description: data.description,
          notes: "",
          status: "todo",
          priority: data.priority,
          startDate,
          dueDate: addDays(startDate, Math.max(0, data.durationDays - 1)),
          estimatedMinutes: Math.max(5, Math.round(data.estimatedMinutes / 5) * 5),
          dependsOn: data.dependsOn.map((k) => this.taskKeys.get(k)).filter((v): v is string => Boolean(v)),
          subtasks: data.subtasks.map((title) => ({ id: uuid(), title, done: false })),
          order: this.tasks.filter((t) => t.phaseId === phaseId).length,
        };
        this.tasks.push(task);
        return [...out, ...this.advance(task.dependsOn.length ? "dependencies" : "tasks"), { type: "task", task }];
      }

      case "milestone": {
        const milestone: Milestone = {
          id: uuid(),
          phaseId: data.phase ? (this.phaseKeys.get(data.phase) ?? null) : null,
          title: data.title,
          description: data.description,
          date: addDays(today, data.day),
          reached: false,
          order: this.milestones.length,
        };
        this.milestones.push(milestone);
        return [...this.advance("timeline"), { type: "milestone", milestone }];
      }

      case "risk": {
        const risk: Risk = { id: uuid(), title: data.title, mitigation: data.mitigation, likelihood: data.likelihood };
        this.risks.push(risk);
        return [...this.advance("finalizing"), { type: "risk", risk }];
      }

      case "resource": {
        const resource: Resource = {
          id: uuid(),
          title: data.title,
          kind: data.kind,
          url: data.url ?? null,
          note: data.note,
          order: this.resources.length,
        };
        this.resources.push(resource);
        return [...this.advance("finalizing"), { type: "resource", resource }];
      }

      case "next":
        this.nextActions = data.actions;
        return [...this.advance("finalizing"), { type: "next", actions: data.actions }];
    }
  }

  /** Build the final, normalized and validated plan. Throws if incomplete or invalid. */
  finish(model = this.input.model): Plan {
    const m = this.meta;
    if (!m || this.tasks.length === 0) throw new Error("Incomplete plan");
    const { today, preferences } = this.input;
    const blocked = new Set([...preferences.blockedWeekdays, ...(m.constraints.blockedWeekdays ?? [])]);
    const lastDate = [...this.tasks.map((t) => t.dueDate), ...this.milestones.map((x) => x.date)].reduce(maxDate, today);
    const now = new Date().toISOString();

    const draft: Plan = {
      id: this.input.planId,
      title: m.title,
      description: m.description,
      objective: m.objective,
      prompt: this.input.prompt,
      status: "active",
      priority: m.priority,
      startDate: today,
      endDate: maxDate(lastDate, addDays(today, m.durationDays - 1)),
      assumptions: m.assumptions,
      priorities: m.priorities,
      nextActions: this.nextActions,
      risks: this.risks,
      constraints: {
        dailyMinutes: m.constraints.dailyMinutes ?? preferences.dailyMinutes,
        blockedWeekdays: blocked.size >= 7 ? [] : [...blocked].sort(),
        dayStartMinute: 9 * 60,
      },
      notes: "",
      model,
      phases: this.phases,
      tasks: this.tasks,
      milestones: this.milestones,
      resources: this.resources,
      schedule: [],
      createdAt: now,
      updatedAt: now,
    };

    const plan = PlanSchema.safeParse(normalizePlan(draft));
    if (!plan.success) throw new Error(`Generated plan failed validation: ${plan.error.message}`);
    return plan.data;
  }
}
