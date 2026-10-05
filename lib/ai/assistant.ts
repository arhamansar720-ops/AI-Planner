import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ResponseStyle } from "@/lib/config";
import { applyMutation } from "@/lib/planning/mutations";
import type { Plan } from "@/types/plan";
import { getAnthropic, modelOptions } from "./client";
import { ASSISTANT_SYSTEM_PROMPT, assistantStyleNote, serializePlanForAssistant } from "./prompts";
import { collapse, toMutation } from "./operations";
import { AssistantResponse } from "./schemas";

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
