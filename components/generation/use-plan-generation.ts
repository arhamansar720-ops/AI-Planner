"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StageId } from "@/lib/planning/stages";
import type { ContextItemInput } from "@/lib/validation/api";
import type { DraftPlan, Milestone, Phase, Plan, Resource, Risk, Task } from "@/types/plan";

export type GenerationStatus = "idle" | "streaming" | "clarify" | "ready" | "error";

export type GenerationRequest = {
  prompt: string;
  today: string;
  model: string;
  context: ContextItemInput[];
  clarification?: { question: string; answer: string } | null;
};

type ServerEvent =
  | { event: "stage"; data: { stage: StageId } }
  | { event: "meta"; data: { meta: NonNullable<DraftPlan["meta"]> } }
  | { event: "phase"; data: { phase: Phase } }
  | { event: "task"; data: { task: Task } }
  | { event: "milestone"; data: { milestone: Milestone } }
  | { event: "risk"; data: { risk: Risk } }
  | { event: "resource"; data: { resource: Resource } }
  | { event: "next"; data: { actions: string[] } }
  | { event: "clarify"; data: { question: string; options: string[] } }
  | { event: "done"; data: { plan: Plan } }
  | { event: "error"; data: { message: string; reason?: string } };

export type GenerationState = {
  status: GenerationStatus;
  stage: StageId | null;
  draft: DraftPlan;
  plan: Plan | null;
  clarify: { question: string; options: string[] } | null;
  error: string | null;
  request: GenerationRequest | null;
};

const EMPTY_DRAFT: DraftPlan = {
  meta: null,
  phases: [],
  tasks: [],
  milestones: [],
  risks: [],
  resources: [],
  nextActions: [],
};

const INITIAL: GenerationState = {
  status: "idle",
  stage: null,
  draft: EMPTY_DRAFT,
  plan: null,
  clarify: null,
  error: null,
  request: null,
};

/**
 * Minimum spacing between visual updates. The data is real and arrives in
 * stream order; the pacer only makes sure a burst of lines doesn't land in a
 * single frame, so each element gets its moment.
 */
const PACE: Record<ServerEvent["event"], number> = {
  stage: 260,
  meta: 420,
  phase: 300,
  task: 95,
  milestone: 160,
  risk: 60,
  resource: 50,
  next: 80,
  clarify: 0,
  done: 700,
  error: 0,
};

export function usePlanGeneration(options: { onUnauthorized: () => void }) {
  const [state, setState] = useState<GenerationState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<ServerEvent[]>([]);
  const drainingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const onUnauthorized = useRef(options.onUnauthorized);
  useEffect(() => {
    onUnauthorized.current = options.onUnauthorized;
  });

  const apply = useCallback((e: ServerEvent) => {
    setState((s) => {
      const d = s.draft;
      switch (e.event) {
        case "stage":
          return { ...s, stage: e.data.stage };
        case "meta":
          return { ...s, draft: { ...d, meta: e.data.meta } };
        case "phase":
          return { ...s, draft: { ...d, phases: [...d.phases, e.data.phase] } };
        case "task":
          return { ...s, draft: { ...d, tasks: [...d.tasks, e.data.task] } };
        case "milestone":
          return { ...s, draft: { ...d, milestones: [...d.milestones, e.data.milestone] } };
        case "risk":
          return { ...s, draft: { ...d, risks: [...d.risks, e.data.risk] } };
        case "resource":
          return { ...s, draft: { ...d, resources: [...d.resources, e.data.resource] } };
        case "next":
          return { ...s, draft: { ...d, nextActions: e.data.actions } };
        case "clarify":
          return { ...s, status: "clarify", clarify: e.data };
        case "done":
          return { ...s, status: "ready", stage: "finalizing", plan: e.data.plan };
        case "error":
          return { ...s, status: "error", error: e.data.message };
      }
    });
  }, []);

  // The pacer reschedules itself, so it lives in a ref rather than a hook dependency chain.
  const drainRef = useRef<(run: number) => void>(() => {});
  useEffect(() => {
    drainRef.current = (run: number) => {
      if (run !== runRef.current) return;
      const next = queueRef.current.shift();
      if (!next) {
        drainingRef.current = false;
        return;
      }
      drainingRef.current = true;
      apply(next);
      const backlog = queueRef.current.length;
      // Catch up gracefully when the model is faster than the animation.
      const factor = backlog > 30 ? 0.25 : backlog > 12 ? 0.5 : 1;
      const delay = queueRef.current[0] ? PACE[queueRef.current[0].event] * factor : 0;
      timerRef.current = window.setTimeout(() => drainRef.current(run), delay);
    };
  }, [apply]);

  const enqueue = useCallback((run: number, event: ServerEvent) => {
    if (run !== runRef.current) return;
    queueRef.current.push(event);
    if (!drainingRef.current) {
      drainingRef.current = true;
      timerRef.current = window.setTimeout(() => drainRef.current(run), 0);
    }
  }, []);

  const cancel = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    queueRef.current = [];
    drainingRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState(INITIAL);
  }, [cancel]);

  const start = useCallback(
    async (request: GenerationRequest) => {
      cancel();
      const run = runRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ ...INITIAL, status: "streaming", request });

      const fail = () =>
        enqueue(run, { event: "error", data: { message: "Something went wrong while building your plan." } });

      let response: Response;
      try {
        response = await fetch("/api/plans/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } catch {
        if (!controller.signal.aborted) fail();
        return;
      }
      if (response.status === 401) {
        onUnauthorized.current();
        return;
      }
      if (!response.ok || !response.body) {
        fail();
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let finished = false;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSSE(chunk);
            if (parsed) {
              if (parsed.event === "done" || parsed.event === "error" || parsed.event === "clarify") finished = true;
              enqueue(run, parsed);
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!finished && !controller.signal.aborted) fail();
    },
    [cancel, enqueue],
  );

  useEffect(() => cancel, [cancel]);

  return { state, start, reset, cancel };
}

function parseSSE(chunk: string): ServerEvent | null {
  let event = "message";
  let data = "";
  for (const line of chunk.split("\n")) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return null;
  try {
    return { event, data: JSON.parse(data) } as ServerEvent;
  } catch {
    return null;
  }
}
