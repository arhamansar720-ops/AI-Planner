"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlanningCanvas } from "@/components/generation/planning-canvas";
import { PromptHeader } from "@/components/generation/prompt-header";
import { usePlanGeneration } from "@/components/generation/use-plan-generation";
import { pickHeading, SUGGESTIONS } from "@/components/home/phrases";
import { PromptComposer, type ComposerHandle } from "@/components/home/prompt-composer";
import { PromptHeading } from "@/components/home/prompt-heading";
import { SuggestionChips } from "@/components/home/suggestion-chips";
import { NEW_PLAN_EVENT, TopNav, type NavUser } from "@/components/shell/top-nav";
import { resolveModel } from "@/lib/config";
import { ease } from "@/lib/motion";
import { localToday } from "@/lib/planning/dates";
import type { ContextItemInput } from "@/lib/validation/api";
import type { PlanSummary } from "@/types/plan";
import { Workspace } from "./workspace";

type Stage = "home" | "generating" | "workspace";
const DRAFT_KEY = "forma:draft";

/**
 * The core product loop, all on one surface so it can transform continuously:
 * centered prompt → prompt travels to the top → planning canvas assembles the
 * plan from the live stream → canvas hands its pieces to the workspace.
 */
export function PlannerExperience({
  user,
  initialHeading,
  defaultModel,
  recentPlans,
}: {
  user: NavUser;
  initialHeading: number;
  defaultModel: string;
  recentPlans: PlanSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("home");
  const [heading, setHeading] = useState(initialHeading);
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState<ContextItemInput[]>([]);
  const [model, setModel] = useState(defaultModel);
  const composerRef = useRef<ComposerHandle>(null);

  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ prompt, context }));
    } catch {}
  }, [prompt, context]);

  const goToLogin = useCallback(() => {
    saveDraft();
    router.push("/login?next=/");
  }, [router, saveDraft]);

  const generation = usePlanGeneration({ onUnauthorized: goToLogin });
  const { state } = generation;

  // Restore an unsent prompt (e.g. after signing in, or a failed attempt).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { prompt?: string; context?: ContextItemInput[] };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after mount
      if (draft.prompt) setPrompt(draft.prompt);
      if (Array.isArray(draft.context)) setContext(draft.context.slice(0, 6));
    } catch {}
  }, []);

  // Keep the draft safe while typing.
  useEffect(() => {
    if (stage !== "home") return;
    const t = window.setTimeout(saveDraft, 300);
    return () => window.clearTimeout(t);
  }, [stage, saveDraft]);

  const reset = useCallback(
    (options: { keepPrompt: boolean }) => {
      generation.reset();
      setStage("home");
      setHeading((h) => pickHeading(h));
      if (!options.keepPrompt) {
        setPrompt("");
        setContext([]);
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
      }
      requestAnimationFrame(() => composerRef.current?.focus());
    },
    [generation],
  );

  // "New Plan" anywhere in the chrome returns to the empty prompt.
  useEffect(() => {
    const onNew = () => reset({ keepPrompt: false });
    window.addEventListener(NEW_PLAN_EVENT, onNew);
    return () => window.removeEventListener(NEW_PLAN_EVENT, onNew);
  }, [reset]);

  // Browser back from /plan/[id] (pushed after generation) returns home.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow history navigation
    if (pathname === "/" && stage === "workspace") reset({ keepPrompt: false });
  }, [pathname, stage, reset]);

  // The completion moment, then hand off to the workspace.
  const planId = state.plan?.id;
  useEffect(() => {
    if (state.status !== "ready" || !planId) return;
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    const t = window.setTimeout(() => {
      setStage("workspace");
      window.history.pushState(null, "", `/plan/${planId}`);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [state.status, planId]);

  const submit = () => {
    const text = prompt.trim();
    if (text.length < 2) return;
    if (!user) {
      goToLogin();
      return;
    }
    saveDraft();
    setStage("generating");
    void generation.start({ prompt: text, context, model, today: localToday() });
  };

  const changeModel = (id: string) => {
    setModel(id);
    if (user) {
      void fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: id }),
      });
    }
  };

  const applySuggestion = (starter: string) => {
    setPrompt((current) => {
      const trimmed = current.trim();
      const existing = SUGGESTIONS.find((s) => trimmed.startsWith(s.starter.trim()));
      if (!trimmed) return starter;
      if (existing) return starter + trimmed.slice(existing.starter.trim().length).trimStart();
      return starter + trimmed[0].toLowerCase() + trimmed.slice(1);
    });
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      const el = document.getElementById("prompt") as HTMLTextAreaElement | null;
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const showBackdrop = stage !== "workspace";

  return (
    <div className="relative min-h-dvh">
      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            key="backdrop"
            className="pointer-events-none fixed inset-0 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            aria-hidden
          >
            <div className="app-backdrop app-backdrop-mask absolute inset-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <TopNav user={user} />

      <LayoutGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {stage === "home" && (
            <motion.main
              key="home"
              id="main"
              className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col items-center justify-center gap-7 px-4 pb-[14vh] sm:gap-8"
              exit={{ opacity: 0, transition: { duration: 0.3, ease: ease.out } }}
            >
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: ease.expo }}
              >
                <PromptHeading index={heading} />
              </motion.div>
              <PromptComposer
                ref={composerRef}
                value={prompt}
                onChange={setPrompt}
                onSubmit={submit}
                context={context}
                onContextChange={setContext}
                model={model}
                onModelChange={changeModel}
                recentPlans={recentPlans}
              />
              <SuggestionChips onPick={applySuggestion} />
            </motion.main>
          )}

          {stage === "generating" && (
            <motion.main
              key="generating"
              id="main"
              className="flex w-full flex-col items-center gap-5 px-4 pb-12 pt-2 sm:gap-6 sm:px-6"
              exit={{ opacity: 0, transition: { duration: 0.4, ease: ease.out } }}
            >
              <PromptHeader
                prompt={state.request?.prompt ?? prompt}
                contextCount={context.length}
                editLabel={state.status === "streaming" ? "Stop" : "Edit"}
                onEdit={() => reset({ keepPrompt: true })}
              />
              <div className="relative flex w-full justify-center">
                {/* Ambient light behind the glass. */}
                <div
                  className="pointer-events-none absolute left-1/2 top-[18%] h-[60%] w-[70%] -translate-x-1/2 rounded-full bg-accent opacity-[0.07] blur-[90px] dark:opacity-[0.12]"
                  aria-hidden
                />
                <PlanningCanvas
                  state={state}
                  modelLabel={resolveModel(model).label}
                  onRetry={() => state.request && generation.start(state.request)}
                  onEdit={() => reset({ keepPrompt: true })}
                  onClarify={(answer) =>
                    state.request &&
                    state.clarify &&
                    generation.start({ ...state.request, clarification: { question: state.clarify.question, answer } })
                  }
                />
              </div>
            </motion.main>
          )}

          {stage === "workspace" && state.plan && (
            <motion.div key="workspace" initial={{ opacity: 1 }} className="w-full">
              <Workspace plan={state.plan} handoff />
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
