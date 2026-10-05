import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { addDays, maxDate } from "@/lib/planning/dates";
import { normalizePlan } from "@/lib/planning/schedule";
import { STAGES, stageIndex, type StageId } from "@/lib/planning/stages";
import { PlanSchema } from "@/lib/validation/plan";
import type { Milestone, Phase, Plan, Resource, Risk, Task } from "@/types/plan";
import { getAnthropic, modelOptions } from "./client";
import { buildPlannerUserMessage, PLANNER_SYSTEM_PROMPT, type ContextItem, type PlannerPreferences } from "./prompts";
import { PlanLine } from "./schemas";

export type PlannerEvent =
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
  | { type: "clarify"; question: string; options: string[] }
  | { type: "plan"; plan: Plan };

export type PlannerInput = {
  planId: string;
  prompt: string;
  today: string;
  model: string;
  preferences: PlannerPreferences;
  context: ContextItem[];
  clarification?: { question: string; answer: string } | null;
};

export class PlannerError extends Error {
  constructor(message: string, readonly reason: "refusal" | "empty" | "invalid" | "api") {
    super(message);
  }
}

const uuid = () => crypto.randomUUID();

/**
 * Streams a plan from Claude, converting each NDJSON line into a domain
 * entity as soon as it is complete. Yields progress events for the UI and,
 * last, the fully normalized plan.
 */
export async function* generatePlan(input: PlannerInput, signal: AbortSignal): AsyncGenerator<PlannerEvent> {
  const { today } = input;
  const anthropic = getAnthropic();

  let stage = -1;
  function* advance(to: StageId): Generator<PlannerEvent> {
    const target = stageIndex(to);
    while (stage < target) {
      stage++;
      yield { type: "stage", stage: STAGES[stage].id };
    }
  }

  yield* advance("understanding");

  // Conversion state.
  const phaseKeys = new Map<string, string>();
  const taskKeys = new Map<string, string>();
  const phases: Phase[] = [];
  const tasks: Task[] = [];
  const milestones: Milestone[] = [];
  const risks: Risk[] = [];
  const resources: Resource[] = [];
  let nextActions: string[] = [];
  let meta: Extract<PlanLine, { type: "meta" }> | null = null;
  let clarified = false;

  function ensurePhase(): Phase {
    if (phases.length) return phases[phases.length - 1];
    const phase: Phase = {
      id: uuid(),
      title: "Getting started",
      summary: "",
      startDate: today,
      endDate: addDays(today, 6),
      order: 0,
    };
    phases.push(phase);
    return phase;
  }

  function* handleLine(raw: string): Generator<PlannerEvent> {
    const line = raw.trim();
    if (!line.startsWith("{")) return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      console.warn("[planner] skipped malformed line", line.slice(0, 200));
      return;
    }
    const parsed = PlanLine.safeParse(json);
    if (!parsed.success) {
      console.warn("[planner] skipped invalid line", parsed.error.issues[0]?.message, line.slice(0, 200));
      return;
    }
    const data = parsed.data;

    switch (data.type) {
      case "clarify":
        if (phases.length === 0 && tasks.length === 0) {
          clarified = true;
          yield { type: "clarify", question: data.question, options: data.options };
        }
        return;

      case "meta": {
        if (meta) return;
        meta = data;
        yield* advance("constraints");
        yield {
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
        };
        yield* advance("phases");
        return;
      }

      case "phase": {
        yield* advance("phases");
        const id = uuid();
        phaseKeys.set(data.key, id);
        const phase: Phase = {
          id,
          title: data.title,
          summary: data.summary,
          startDate: addDays(today, data.startDay),
          endDate: addDays(today, Math.max(data.endDay, data.startDay)),
          order: phases.length,
        };
        phases.push(phase);
        yield { type: "phase", phase };
        return;
      }

      case "task": {
        const knownPhase = phaseKeys.get(data.phase);
        const phaseId = knownPhase ?? ensurePhase().id;
        if (!knownPhase && phases.length === 1 && !phaseKeys.size) {
          yield { type: "phase", phase: phases[0] };
          phaseKeys.set(data.phase, phaseId);
        }
        const id = uuid();
        taskKeys.set(data.key, id);
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
          dependsOn: data.dependsOn.map((k) => taskKeys.get(k)).filter((v): v is string => Boolean(v)),
          subtasks: data.subtasks.map((title) => ({ id: uuid(), title, done: false })),
          order: tasks.filter((t) => t.phaseId === phaseId).length,
        };
        tasks.push(task);
        yield* advance(task.dependsOn.length ? "dependencies" : "tasks");
        yield { type: "task", task };
        return;
      }

      case "milestone": {
        yield* advance("timeline");
        const milestone: Milestone = {
          id: uuid(),
          phaseId: data.phase ? (phaseKeys.get(data.phase) ?? null) : null,
          title: data.title,
          description: data.description,
          date: addDays(today, data.day),
          reached: false,
          order: milestones.length,
        };
        milestones.push(milestone);
        yield { type: "milestone", milestone };
        return;
      }

      case "risk": {
        yield* advance("finalizing");
        const risk: Risk = { id: uuid(), title: data.title, mitigation: data.mitigation, likelihood: data.likelihood };
        risks.push(risk);
        yield { type: "risk", risk };
        return;
      }

      case "resource": {
        yield* advance("finalizing");
        const resource: Resource = {
          id: uuid(),
          title: data.title,
          kind: data.kind,
          url: data.url ?? null,
          note: data.note,
          order: resources.length,
        };
        resources.push(resource);
        yield { type: "resource", resource };
        return;
      }

      case "next":
        yield* advance("finalizing");
        nextActions = data.actions;
        yield { type: "next", actions: data.actions };
        return;
    }
  }

  const { model, ...options } = modelOptions(input.model, "plan");
  const stream = anthropic.beta.messages.stream(
    {
      ...options,
      model,
      max_tokens: 32000,
      system: [{ type: "text", text: PLANNER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: buildPlannerUserMessage({
            prompt: input.prompt,
            today,
            preferences: input.preferences,
            context: input.context,
            clarification: input.clarification,
          }),
        },
      ],
    },
    { signal },
  );

  let buffer = "";
  try {
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "thinking") {
        yield* advance("constraints");
      }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        buffer += event.delta.text;
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          yield* handleLine(line);
          if (clarified) {
            stream.abort();
            return;
          }
          newline = buffer.indexOf("\n");
        }
      }
    }
  } catch (error) {
    if (clarified) return;
    if (error instanceof Anthropic.APIError) {
      throw new PlannerError(`Anthropic API error ${error.status}: ${error.message}`, "api");
    }
    throw error;
  }
  if (buffer.trim()) yield* handleLine(buffer);
  if (clarified) return;

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    throw new PlannerError("Model declined to produce a plan", "refusal");
  }
  if (!meta || tasks.length === 0) {
    throw new PlannerError(`Incomplete plan (stop_reason=${final.stop_reason})`, "empty");
  }

  yield* advance("finalizing");

  const m = meta as Extract<PlanLine, { type: "meta" }>;
  const blocked = new Set([...input.preferences.blockedWeekdays, ...(m.constraints.blockedWeekdays ?? [])]);
  const lastDate = [...tasks.map((t) => t.dueDate), ...milestones.map((x) => x.date)].reduce(maxDate, today);
  const now = new Date().toISOString();

  const draft: Plan = {
    id: input.planId,
    title: m.title,
    description: m.description,
    objective: m.objective,
    prompt: input.prompt,
    status: "active",
    priority: m.priority,
    startDate: today,
    endDate: maxDate(lastDate, addDays(today, m.durationDays - 1)),
    assumptions: m.assumptions,
    priorities: m.priorities,
    nextActions,
    risks,
    constraints: {
      dailyMinutes: m.constraints.dailyMinutes ?? input.preferences.dailyMinutes,
      blockedWeekdays: blocked.size >= 7 ? [] : [...blocked].sort(),
      dayStartMinute: 9 * 60,
    },
    notes: "",
    model: final.model ?? input.model,
    phases,
    tasks,
    milestones,
    resources,
    schedule: [],
    createdAt: now,
    updatedAt: now,
  };

  const plan = PlanSchema.safeParse(normalizePlan(draft));
  if (!plan.success) {
    throw new PlannerError(`Generated plan failed validation: ${plan.error.message}`, "invalid");
  }
  yield { type: "plan", plan: plan.data };
}
