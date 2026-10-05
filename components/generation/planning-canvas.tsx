"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ease, spring } from "@/lib/motion";
import { useEngineState } from "@/lib/ai/local/engine";
import { STAGES, stageIndex } from "@/lib/planning/stages";
import type { GenerationState } from "./use-plan-generation";
import { PlanGraph } from "./plan-graph";
import { StageList } from "./stage-list";
import { StatusIndicator } from "./status-indicator";

export function PlanningCanvas({
  state,
  modelLabel,
  onRetry,
  onEdit,
  onClarify,
}: {
  state: GenerationState;
  modelLabel: string;
  onRetry: () => void;
  onEdit: () => void;
  onClarify: (answer: string) => void;
}) {
  const { status, stage, draft } = state;
  const feedRef = useRef<HTMLDivElement>(null);

  // On small screens the canvas is a feed: keep the newest piece of the plan in view.
  useEffect(() => {
    const el = feedRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [draft.tasks.length, draft.phases.length, draft.milestones.length]);
  const stageInfo = stage ? STAGES[stageIndex(stage)] : STAGES[0];
  const ready = status === "ready";
  const engine = useEngineState();
  const preparing = status === "streaming" && engine.status === "loading" ? engine : null;

  const indicator =
    status === "ready"
      ? { label: "Ready", state: "ready" as const }
      : status === "error"
        ? { label: "Paused", state: "error" as const }
        : status === "clarify"
          ? { label: "Needs input", state: "waiting" as const }
          : preparing
            ? { label: "Preparing", state: "working" as const }
            : { label: stageInfo.status, state: "working" as const };

  const line =
    status === "ready"
      ? "Your plan is ready."
      : status === "error"
        ? (state.error ?? "Something went wrong while building your plan.")
        : status === "clarify"
          ? "One quick question before I plan this."
          : preparing
            ? `${preparing.cached ? "Loading" : "Downloading"} the on-device model · ${Math.round(preparing.progress * 100)}%${preparing.cached ? "" : " · first time only"}`
            : stageInfo.line;

  const progress = ready
    ? 1
    : status === "streaming"
      ? Math.min(0.96, ((stage ? stageIndex(stage) : 0) + Math.min(1, draft.tasks.length / 24)) / STAGES.length)
      : 0;

  return (
    <motion.section
      aria-label="Building your plan"
      aria-busy={status === "streaming"}
      initial={{ opacity: 0, y: 28, scale: 0.97, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{
        ...spring.travel,
        delay: 0.32,
        opacity: { duration: 0.5, delay: 0.32 },
        filter: { duration: 0.6, delay: 0.32 },
      }}
      style={{ borderRadius: 28 }}
      className="glass relative w-full max-w-[1080px] overflow-hidden"
    >
      {/* Invisible anchor that carries the shared-layout handoff to the workspace,
          so the surface itself never scale-animates while its content grows. */}
      <motion.span layoutId="plan-surface" className="pointer-events-none absolute inset-0 opacity-0" aria-hidden />
      {/* Completion: a single soft accent breath around the surface. */}
      <AnimatePresence>
        {ready && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.4, ease: ease.out }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <header className="flex h-12 items-center justify-between border-b border-glass-edge px-5">
        <StatusIndicator label={indicator.label} state={indicator.state} />
        <span className="text-xs text-fg-subtle">{modelLabel}</span>
      </header>

      <div className="grid md:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden border-r border-glass-edge px-6 py-7 md:block">
          <StageList stage={stage} complete={ready} />
        </aside>
        <div className="relative min-h-[380px] px-4 py-6 sm:px-7 sm:py-7 md:min-h-[460px]">
          <AnimatePresence mode="wait" initial={false}>
            {status === "error" ? (
              <CenterMessage key="error">
                <p className="max-w-md text-balance text-[15px] font-medium text-fg">
                  {state.error ?? "Something went wrong while building your plan."}
                </p>
                <p className="mt-1 text-sm text-fg-muted">Your prompt is safe. Try again, or adjust it first.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <Button variant="primary" onClick={onRetry}>
                    <RotateCcw /> Try again
                  </Button>
                  <Button variant="secondary" onClick={onEdit}>
                    Edit prompt
                  </Button>
                </div>
              </CenterMessage>
            ) : status === "clarify" && state.clarify ? (
              <Clarify key="clarify" question={state.clarify.question} options={state.clarify.options} onAnswer={onClarify} />
            ) : (
              <motion.div
                key="graph"
                ref={feedRef}
                className="h-full max-md:-mx-4 max-md:max-h-[52dvh] max-md:overflow-y-auto max-md:px-4 max-md:[mask-image:linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-24px),transparent)] max-md:no-scrollbar"
                exit={{ opacity: 0 }}
              >
                <PlanGraph draft={draft} streaming={status === "streaming"} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="relative flex h-12 items-center gap-4 border-t border-glass-edge px-5">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={preparing ? "preparing" : line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: ease.expo }}
              className="flex items-center gap-2 truncate text-[13px] text-fg-muted"
            >
              {ready && <Check className="size-3.5 text-accent" strokeWidth={2.5} />}
              {line}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="hidden shrink-0 text-xs tabular-nums text-fg-subtle sm:block">
          {draft.phases.length > 0 && (
            <>
              {draft.phases.length} {draft.phases.length === 1 ? "phase" : "phases"} · {draft.tasks.length}{" "}
              {draft.tasks.length === 1 ? "task" : "tasks"}
              {draft.milestones.length > 0 && ` · ${draft.milestones.length} milestones`}
            </>
          )}
        </p>
        {/* Progress hairline */}
        <motion.span
          className="absolute inset-x-0 top-0 h-px origin-left bg-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress, opacity: ready ? 0 : 0.7 }}
          transition={{ duration: 0.8, ease: ease.expo }}
          aria-hidden
        />
      </footer>
    </motion.section>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: ease.expo }}
      className="flex h-full min-h-[320px] flex-col items-center justify-center text-center"
      role="alert"
    >
      {children}
    </motion.div>
  );
}

function Clarify({ question, options, onAnswer }: { question: string; options: string[]; onAnswer: (a: string) => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <CenterMessage>
      <p className="max-w-md text-balance text-[17px] font-medium tracking-[-0.01em] text-fg">{question}</p>
      {options.length > 0 && (
        <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onAnswer(o)}
              className="h-8 rounded-full border border-border bg-surface px-3.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg active:scale-[0.97]"
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <form
        className="mt-4 flex w-full max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (answer.trim()) onAnswer(answer.trim());
        }}
      >
        <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Or answer in your own words" aria-label="Your answer" />
        <Button type="submit" variant="primary" disabled={!answer.trim()} aria-label="Continue">
          <ArrowRight />
        </Button>
      </form>
    </CenterMessage>
  );
}
