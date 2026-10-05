import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ResponseStyle } from "@/lib/config";
import { isValidISODate } from "@/lib/planning/dates";
import { applyMutation, createBlankTask } from "@/lib/planning/mutations";
import type { Mutation } from "@/lib/validation/mutations";
import type { Plan } from "@/types/plan";
import { getAnthropic, modelOptions } from "./client";
import { ASSISTANT_SYSTEM_PROMPT, assistantStyleNote, serializePlanForAssistant } from "./prompts";
import { AssistantResponse, type AssistantOperation } from "./schemas";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantResult = {
  reply: string;
  plan: Plan;
  changes: string[];
};

/**
 * Ask Claude about a plan. The model answers and proposes structured
 * operations; each is converted to a regular plan mutation and applied by
 * the same reducer the UI uses.
 */
export async function runAssistant(input: {
  plan: Plan;
  history: ChatTurn[];
  message: string;
  today: string;
  model: string;
  responseStyle: ResponseStyle;
}): Promise<AssistantResult> {
  const anthropic = getAnthropic();
  const { model, ...options } = modelOptions(input.model, "assistant");

  const response = await anthropic.beta.messages.parse({
    ...options,
    model,
    max_tokens: 16000,
    output_config: { ...options.output_config, format: betaZodOutputFormat(AssistantResponse) },
    system: [
      { type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: assistantStyleNote(input.responseStyle) },
    ],
    messages: [
      ...input.history.slice(-16).map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `<plan>\n${serializePlanForAssistant(input.plan, input.today)}\n</plan>\n\n${input.message}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return { reply: "I can't help with that request, but I'm happy to help with anything else about this plan.", plan: input.plan, changes: [] };
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`Assistant returned unparseable output (stop_reason=${response.stop_reason})`);

  let plan = input.plan;
  const changes: string[] = [];
  for (const op of parsed.operations) {
    const converted = toMutation(plan, op);
    if (!converted) continue;
    try {
      plan = applyMutation(plan, converted.mutation);
      changes.push(converted.summary);
    } catch (error) {
      console.warn("[assistant] skipped operation", op.type, (error as Error).message);
    }
  }

  return { reply: parsed.reply.trim(), plan, changes: collapse(changes) };
}

function toMutation(plan: Plan, op: AssistantOperation): { mutation: Mutation; summary: string } | null {
  const task = op.taskId ? plan.tasks.find((t) => t.id === op.taskId) : undefined;
  const date = (v: string | null) => (v && isValidISODate(v) ? v : undefined);
  const minutes = (v: number | null) =>
    v == null ? undefined : Math.min(60 * 24 * 14, Math.max(5, Math.round(v / 5) * 5));
  const deps = (v: string[] | null) =>
    v == null ? undefined : v.filter((id) => plan.tasks.some((t) => t.id === id));

  switch (op.type) {
    case "update_task": {
      if (!task) return null;
      const patch = Object.fromEntries(
        Object.entries({
          title: op.title?.trim() || undefined,
          description: op.description ?? undefined,
          priority: op.priority ?? undefined,
          startDate: date(op.startDate),
          dueDate: date(op.dueDate),
          estimatedMinutes: minutes(op.estimatedMinutes),
          dependsOn: deps(op.dependsOn)?.filter((d) => d !== task.id),
        }).filter(([, v]) => v !== undefined),
      );
      if (!Object.keys(patch).length) return null;
      return { mutation: { type: "task.update", taskId: task.id, patch }, summary: "Updated tasks" };
    }
    case "add_task": {
      const phaseId = plan.phases.some((p) => p.id === op.phaseId) ? op.phaseId! : plan.phases.at(-1)?.id;
      if (!phaseId || !op.title?.trim()) return null;
      const base = createBlankTask(plan, phaseId, crypto.randomUUID(), op.title.trim().slice(0, 300));
      const startDate = date(op.startDate) ?? base.startDate;
      return {
        mutation: {
          type: "task.add",
          task: {
            ...base,
            description: op.description ?? "",
            priority: op.priority ?? "medium",
            startDate,
            dueDate: date(op.dueDate) && date(op.dueDate)! >= startDate ? date(op.dueDate)! : base.dueDate < startDate ? startDate : base.dueDate,
            estimatedMinutes: minutes(op.estimatedMinutes) ?? 60,
            dependsOn: deps(op.dependsOn) ?? [],
          },
        },
        summary: "Added tasks",
      };
    }
    case "delete_task":
      return task ? { mutation: { type: "task.delete", taskId: task.id }, summary: "Removed tasks" } : null;
    case "complete_task":
      return task && task.status !== "done"
        ? { mutation: { type: "task.toggle", taskId: task.id }, summary: "Completed tasks" }
        : null;
    case "set_daily_minutes": {
      const m = op.dailyMinutes == null ? null : Math.min(960, Math.max(10, Math.round(op.dailyMinutes)));
      return m
        ? { mutation: { type: "plan.constraints", constraints: { dailyMinutes: m } }, summary: `Set daily time to ${m} minutes` }
        : null;
    }
    case "set_blocked_weekdays": {
      if (!op.blockedWeekdays) return null;
      const days = [...new Set(op.blockedWeekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
      return {
        mutation: { type: "plan.constraints", constraints: { blockedWeekdays: days } },
        summary: "Updated working days",
      };
    }
    case "set_deadline":
      return date(op.date) ? { mutation: { type: "plan.deadline", endDate: op.date! }, summary: "Moved the deadline" } : null;
    case "set_start_date":
      return date(op.date) ? { mutation: { type: "plan.start", startDate: op.date! }, summary: "Moved the start date" } : null;
    case "update_plan": {
      const patch: { title?: string; description?: string } = {};
      if (op.title?.trim()) patch.title = op.title.trim().slice(0, 200);
      if (op.description != null) patch.description = op.description.slice(0, 4000);
      return Object.keys(patch).length ? { mutation: { type: "plan.update", patch }, summary: "Updated the plan" } : null;
    }
  }
}

function collapse(changes: string[]) {
  const counts = new Map<string, number>();
  for (const c of changes) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].map(([label, n]) => {
    if (!/tasks$/.test(label)) return label;
    return label.replace(/tasks$/, n === 1 ? "a task" : `${n} tasks`);
  });
}
