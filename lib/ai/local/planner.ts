"use client";

import type { Plan } from "@/types/plan";
import { PlanAssembler, type AssemblerEvent } from "../assembler";
import { buildPlannerUserMessage, PLANNER_SYSTEM_PROMPT, type ContextItem, type PlannerPreferences } from "../prompts";
import { getActiveModel, loadEngine, streamChat } from "./engine";

/** Prompt plus a complete compact plan must fit in the model's context window. */
const MAX_PLAN_TOKENS = 5600;

export class LocalPlanError extends Error {}

/**
 * Generate a plan with the on-device model. The model streams NDJSON lines;
 * each complete line is turned into a validated entity and reported through
 * `onEvent` straight away. Resolves with the finished plan, or null when the
 * model asked a clarifying question instead.
 */
export async function generatePlanLocally(input: {
  prompt: string;
  today: string;
  preferences: PlannerPreferences;
  context: ContextItem[];
  clarification?: { question: string; answer: string } | null;
  signal: AbortSignal;
  onEvent: (event: AssemblerEvent) => void;
  onLoading?: () => void;
}): Promise<Plan | null> {
  const assembler = new PlanAssembler({
    planId: crypto.randomUUID(),
    prompt: input.prompt,
    today: input.today,
    model: getActiveModel().id,
    preferences: input.preferences,
  });
  const emit = (events: AssemblerEvent[]) => events.forEach(input.onEvent);
  emit(assembler.advance("understanding"));

  input.onLoading?.();
  await loadEngine();
  if (input.signal.aborted) return null;
  emit(assembler.advance("constraints"));

  let buffer = "";
  const stream = streamChat(
    [
      { role: "system", content: PLANNER_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildPlannerUserMessage({
          prompt: input.prompt,
          today: input.today,
          preferences: input.preferences,
          context: input.context,
          clarification: input.clarification,
        }),
      },
    ],
    { maxTokens: MAX_PLAN_TOKENS, signal: input.signal },
  );
  for await (const delta of stream) {
    buffer += delta;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      emit(assembler.push(buffer.slice(0, newline)));
      buffer = buffer.slice(newline + 1);
      if (assembler.clarified) return null;
      newline = buffer.indexOf("\n");
    }
  }
  if (input.signal.aborted) return null;
  if (buffer.trim()) emit(assembler.push(buffer));
  if (assembler.clarified) return null;
  if (!assembler.hasContent) throw new LocalPlanError("The model didn’t produce a usable plan");

  emit(assembler.advance("finalizing"));
  return assembler.finish();
}
