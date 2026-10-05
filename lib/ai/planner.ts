import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Plan } from "@/types/plan";
import { PlanAssembler, type AssemblerEvent } from "./assembler";
import { getAnthropic, modelOptions } from "./client";
import { buildPlannerUserMessage, PLANNER_SYSTEM_PROMPT, type ContextItem, type PlannerPreferences } from "./prompts";

export type PlannerEvent = AssemblerEvent | { type: "plan"; plan: Plan };

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

/**
 * Streams a plan from Claude, converting each NDJSON line into a domain
 * entity as soon as it is complete. Yields progress events for the UI and,
 * last, the fully normalized plan.
 */
export async function* generatePlan(input: PlannerInput, signal: AbortSignal): AsyncGenerator<PlannerEvent> {
  const anthropic = getAnthropic();
  const assembler = new PlanAssembler(input);
  yield* assembler.advance("understanding");

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
            today: input.today,
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
        yield* assembler.advance("constraints");
      }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        buffer += event.delta.text;
        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          yield* assembler.push(line);
          if (assembler.clarified) {
            stream.abort();
            return;
          }
          newline = buffer.indexOf("\n");
        }
      }
    }
  } catch (error) {
    if (assembler.clarified) return;
    if (error instanceof Anthropic.APIError) {
      throw new PlannerError(`Anthropic API error ${error.status}: ${error.message}`, "api");
    }
    throw error;
  }
  if (buffer.trim()) yield* assembler.push(buffer);
  if (assembler.clarified) return;

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    throw new PlannerError("Model declined to produce a plan", "refusal");
  }
  if (!assembler.hasContent) {
    throw new PlannerError(`Incomplete plan (stop_reason=${final.stop_reason})`, "empty");
  }

  yield* assembler.advance("finalizing");
  let plan: Plan;
  try {
    plan = assembler.finish(final.model ?? input.model);
  } catch (error) {
    throw new PlannerError((error as Error).message, "invalid");
  }
  yield { type: "plan", plan };
}
