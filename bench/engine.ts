/**
 * Browser bundle of Forma's real planning core for the Claude test bench:
 * the same prompts, line schemas, assembler, scheduling engine, mutations
 * and assistant-operation converter the Next.js app runs on the server.
 */
export { PlanAssembler } from "@/lib/ai/assembler";
export { collapse, toMutation } from "@/lib/ai/operations";
export {
  ASSISTANT_SYSTEM_PROMPT,
  assistantStyleNote,
  buildPlannerUserMessage,
  PLANNER_SYSTEM_PROMPT,
  serializePlanForAssistant,
} from "@/lib/ai/prompts";
export { AssistantResponse } from "@/lib/ai/schemas";
export * as dates from "@/lib/planning/dates";
export { applyMutation, createBlankTask, MutationError } from "@/lib/planning/mutations";
export { focusForToday, isBlocked, isOverdue, planMeta, progress, upNext, weekLabel } from "@/lib/planning/selectors";
export { STAGES, stageIndex } from "@/lib/planning/stages";
export { product } from "@/lib/config";
