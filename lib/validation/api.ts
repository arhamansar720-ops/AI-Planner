import { z } from "zod";
import { MutationSchema } from "./mutations";
import { isoDate } from "./plan";

export const ContextItemSchema = z.object({
  kind: z.enum(["note", "link", "file", "plan"]),
  label: z.string().trim().min(1).max(200),
  content: z.string().max(40_000),
});

export const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(2).max(8000),
  today: isoDate,
  model: z.string().max(60).optional(),
  context: z.array(ContextItemSchema).max(6).default([]),
  clarification: z
    .object({ question: z.string().max(400), answer: z.string().trim().min(1).max(2000) })
    .nullable()
    .optional(),
});

export const MutateRequestSchema = z.object({
  mutations: z.array(MutationSchema).min(1).max(50),
});

export const AssistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  today: isoDate,
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ContextItemInput = z.infer<typeof ContextItemSchema>;
