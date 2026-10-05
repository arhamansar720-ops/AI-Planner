"use client";

import { z } from "zod";
import type { ResponseStyle } from "@/lib/config";
import { applyMutation } from "@/lib/planning/mutations";
import type { Mutation } from "@/lib/validation/mutations";
import type { Plan } from "@/types/plan";
import { collapse, toMutation } from "../operations";
import { ASSISTANT_SYSTEM_PROMPT, assistantStyleNote, serializePlanForAssistant } from "../prompts";
import { AssistantResponse } from "../schemas";
import { completeJSON, type ChatMessage } from "./engine";

const RESPONSE_SCHEMA = z.toJSONSchema(AssistantResponse);

export type LocalAssistantResult = {
  reply: string;
  plan: Plan;
  mutations: Mutation[];
  changes: string[];
};

/**
 * Ask the on-device model about a plan. Its JSON answer is constrained to the
 * assistant schema; each operation becomes a normal plan mutation, applied
 * with the same reducer the server uses.
 */
export async function runLocalAssistant(input: {
  plan: Plan;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  today: string;
  responseStyle: ResponseStyle;
}): Promise<LocalAssistantResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: `${ASSISTANT_SYSTEM_PROMPT}\n\n${assistantStyleNote(input.responseStyle)}` },
    // The context window is small: keep only the most recent exchange.
    ...input.history.slice(-4).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    {
      role: "user",
      content: `<plan>\n${serializePlanForAssistant(input.plan, input.today)}\n</plan>\n\n${input.message}`,
    },
  ];

  const parsed = AssistantResponse.safeParse(await completeJSON(messages, RESPONSE_SCHEMA, 1200));
  if (!parsed.success) throw new Error("The assistant’s answer didn’t match the expected format");

  let plan = input.plan;
  const mutations: Mutation[] = [];
  const changes: string[] = [];
  for (const op of parsed.data.operations) {
    const converted = toMutation(plan, op);
    if (!converted) continue;
    try {
      plan = applyMutation(plan, converted.mutation);
      mutations.push(converted.mutation);
      changes.push(converted.summary);
    } catch (error) {
      console.warn("[assistant] skipped operation", op.type, (error as Error).message);
    }
  }
  return { reply: parsed.data.reply.trim(), plan, mutations, changes: collapse(changes) };
}
