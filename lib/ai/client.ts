import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { DEFAULT_MODEL, MODELS } from "@/lib/config";

let client: Anthropic | null = null;

/** Server-side Anthropic client. The API key never reaches the browser. */
export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return client;
}

export function pickModel(requested: string | null | undefined): string {
  return MODELS.some((m) => m.id === requested) ? requested! : DEFAULT_MODEL;
}

type Purpose = "plan" | "assistant";

/**
 * Per-model request options. Newer models take adaptive thinking with an
 * effort level; Haiku 4.5 predates effort and runs without thinking here.
 * Server-side refusal fallbacks are enabled where the model supports them.
 */
export function modelOptions(model: string, purpose: Purpose) {
  const base: Pick<BetaMessageStreamParams, "model" | "thinking" | "output_config" | "betas" | "fallbacks"> = {
    model,
  };
  if (model === "claude-haiku-4-5") return base;

  base.thinking = { type: "adaptive" };
  base.output_config = { effort: purpose === "plan" ? "medium" : "low" };
  if (model === "claude-sonnet-5-5" || model === "claude-opus-5-5") {
    base.betas = ["server-side-fallback-2026-07-01"];
    base.fallbacks = "default";
  }
  return base;
}
