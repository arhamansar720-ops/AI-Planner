/**
 * Product-level configuration. Renaming the product or changing the default
 * model should only ever require edits in this file.
 */
export const product = {
  name: "Forma",
  tagline: "Turn an idea into a plan.",
  description:
    "Forma turns what you want to accomplish into a structured, schedulable plan.",
} as const;

export type ModelOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
};

export const MODELS: readonly ModelOption[] = [
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    shortLabel: "Sonnet 5.5",
    description: "Fast, thoughtful planning for most goals",
  },
  {
    id: "claude-opus-5-5",
    label: "Claude Opus 5.5",
    shortLabel: "Opus 5.5",
    description: "Deeper reasoning for complex, multi-month goals",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    shortLabel: "Haiku 4.5",
    description: "Quick first drafts",
  },
] as const;

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export function resolveModel(id: string | null | undefined): ModelOption {
  return MODELS.find((m) => m.id === id) ?? MODELS.find((m) => m.id === DEFAULT_MODEL)!;
}

export const PLANNING_STYLES = [
  { id: "balanced", label: "Balanced", description: "Realistic pace with room to breathe" },
  { id: "ambitious", label: "Ambitious", description: "Tighter timelines, more output" },
  { id: "gentle", label: "Gentle", description: "Lighter workload, more buffer" },
] as const;
export type PlanningStyle = (typeof PLANNING_STYLES)[number]["id"];

export const RESPONSE_STYLES = [
  { id: "concise", label: "Concise" },
  { id: "detailed", label: "Detailed" },
] as const;
export type ResponseStyle = (typeof RESPONSE_STYLES)[number]["id"];
