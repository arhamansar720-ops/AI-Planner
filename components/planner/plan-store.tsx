"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { applyMutation, MutationError } from "@/lib/planning/mutations";
import type { Mutation } from "@/lib/validation/mutations";
import type { Plan } from "@/types/plan";

export type WorkspaceView = "overview" | "timeline" | "tasks" | "calendar" | "milestones" | "resources" | "notes";

type PlanStore = {
  plan: Plan;
  /** Apply a change optimistically and persist it in the background. */
  dispatch: (mutation: Mutation) => void;
  /** Apply and save several mutations at once (assistant edits), with Undo. */
  applyBatch: (mutations: Mutation[], options?: { message?: string }) => void;
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  openTaskId: string | null;
  openTask: (id: string | null) => void;
  assistantDraft: { text: string; nonce: number } | null;
  askAssistant: (text: string) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
};

const Ctx = createContext<PlanStore | null>(null);

export function PlanStoreProvider({
  initialPlan,
  initialView = "overview",
  children,
}: {
  initialPlan: Plan;
  initialView?: WorkspaceView;
  children: React.ReactNode;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [view, setViewState] = useState<WorkspaceView>(initialView);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [assistantDraft, setAssistantDraft] = useState<PlanStore["assistantDraft"]>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Source of truth for synchronous reads; only dispatch/applyBatch change the plan.
  const planRef = useRef(initialPlan);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const toast = useToast();

  const persist = useCallback(
    (planId: string, mutations: Mutation[]) => {
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          const res = await fetch(`/api/plans/${planId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mutations }),
          });
          if (!res.ok) throw new Error(String(res.status));
        } catch {
          toast({ message: "Couldn’t save your last change.", tone: "error", action: { label: "Reload", onClick: () => window.location.reload() } });
        }
      });
    },
    [toast],
  );

  const dispatch = useCallback(
    (mutation: Mutation) => {
      let next: Plan;
      try {
        next = applyMutation(planRef.current, mutation);
      } catch (error) {
        if (error instanceof MutationError) toast({ message: error.message, tone: "error" });
        return;
      }
      planRef.current = next;
      setPlan(next);
      persist(next.id, [mutation]);
    },
    [persist, toast],
  );

  const applyBatch = useCallback<PlanStore["applyBatch"]>(
    (mutations, options) => {
      const previous = planRef.current;
      let next = previous;
      const applied: Mutation[] = [];
      for (const m of mutations) {
        try {
          next = applyMutation(next, m);
          applied.push(m);
        } catch {
          // The model referenced something that no longer exists; skip it.
        }
      }
      if (!applied.length) return;
      planRef.current = next;
      setPlan(next);
      persist(next.id, applied);
      toast({
        message: options?.message ?? "Plan updated",
        action: {
          label: "Undo",
          onClick: () => {
            const restored = { ...previous, updatedAt: new Date().toISOString() };
            planRef.current = restored;
            setPlan(restored);
            persist(previous.id, [{ type: "plan.restore", plan: previous }]);
          },
        },
      });
    },
    [persist, toast],
  );

  const setView = useCallback((v: WorkspaceView) => {
    setViewState(v);
    const url = new URL(window.location.href);
    if (v === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", v);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const askAssistant = useCallback((text: string) => {
    setAssistantDraft({ text, nonce: Date.now() });
    setAssistantOpen(true);
  }, []);

  const value = useMemo<PlanStore>(
    () => ({
      plan,
      dispatch,
      applyBatch,
      view,
      setView,
      openTaskId,
      openTask: setOpenTaskId,
      assistantDraft,
      askAssistant,
      assistantOpen,
      setAssistantOpen,
    }),
    [plan, dispatch, applyBatch, view, setView, openTaskId, assistantDraft, askAssistant, assistantOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlanStore must be used inside PlanStoreProvider");
  return ctx;
}
