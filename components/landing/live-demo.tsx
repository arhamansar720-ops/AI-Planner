"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, CornerDownLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlanGraph } from "@/components/generation/plan-graph";
import { StageList } from "@/components/generation/stage-list";
import { StatusIndicator } from "@/components/generation/status-indicator";
import { PlanAssembler, type AssemblerEvent } from "@/lib/ai/assembler";
import { LOCAL_MODEL } from "@/lib/config";
import { ease } from "@/lib/motion";
import { localToday } from "@/lib/planning/dates";
import { STAGES, stageIndex, type StageId } from "@/lib/planning/stages";
import type { DraftPlan } from "@/types/plan";
import { DEMO_LINES, DEMO_PROMPT } from "./demo-plan";

type Phase = "typing" | "streaming" | "ready";

const EMPTY: DraftPlan = { meta: null, phases: [], tasks: [], milestones: [], risks: [], resources: [], nextActions: [] };

/** Pause after each kind of event, so the demo reads like a real run. */
const PACE: Record<AssemblerEvent["type"], number> = {
  stage: 220,
  meta: 520,
  phase: 360,
  task: 210,
  milestone: 200,
  risk: 80,
  resource: 80,
  next: 300,
  clarify: 0,
};

function eventsFor(): AssemblerEvent[] {
  const assembler = new PlanAssembler({
    planId: "demo",
    prompt: DEMO_PROMPT,
    today: localToday(),
    model: LOCAL_MODEL.id,
    preferences: { dailyMinutes: 45, blockedWeekdays: [] },
  });
  return [
    ...assembler.advance("understanding"),
    ...assembler.advance("constraints"),
    ...DEMO_LINES.flatMap((line) => assembler.push(line)),
    ...assembler.advance("finalizing"),
  ];
}

function reduce(draft: DraftPlan, e: AssemblerEvent): DraftPlan {
  switch (e.type) {
    case "meta":
      return { ...draft, meta: e.meta };
    case "phase":
      return { ...draft, phases: [...draft.phases, e.phase] };
    case "task":
      return { ...draft, tasks: [...draft.tasks, e.task] };
    case "milestone":
      return { ...draft, milestones: [...draft.milestones, e.milestone] };
    case "next":
      return { ...draft, nextActions: e.actions };
    default:
      return draft;
  }
}

/**
 * The product's own planning canvas, replaying a real streamed plan through
 * the real assembler. It loops while it's on screen and rests otherwise.
 */
export function LiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [stage, setStage] = useState<StageId | null>(null);
  const [draft, setDraft] = useState<DraftPlan>(EMPTY);

  useEffect(() => {
    if (!inView) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    const run = () => {
      const events = eventsFor();
      if (reduceMotion) {
        setTyped(DEMO_PROMPT.length);
        setStage("finalizing");
        setDraft(events.reduce(reduce, EMPTY));
        setPhase("ready");
        return;
      }
      setPhase("typing");
      setTyped(0);
      setStage(null);
      setDraft(EMPTY);

      let t = 500;
      for (let i = 1; i <= DEMO_PROMPT.length; i++) {
        at(t, () => setTyped(i));
        t += 22 + Math.random() * 30;
      }
      t += 450;
      at(t, () => setPhase("streaming"));
      t += 300;
      for (const e of events) {
        at(t, () => {
          if (e.type === "stage") setStage(e.stage);
          else setDraft((d) => reduce(d, e));
        });
        t += PACE[e.type];
      }
      at(t + 500, () => setPhase("ready"));
      at(t + 6500, run);
    };
    run();
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduceMotion]);

  // On small screens the canvas is a feed: keep the newest piece in view.
  useEffect(() => {
    const el = feedRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [draft.tasks.length, draft.phases.length, draft.milestones.length, reduceMotion]);

  const ready = phase === "ready";
  const stageInfo = stage ? STAGES[stageIndex(stage)] : STAGES[0];
  const indicator =
    phase === "typing"
      ? { label: "Waiting", state: "waiting" as const }
      : ready
        ? { label: "Ready", state: "ready" as const }
        : { label: stageInfo.status, state: "working" as const };
  const line = phase === "typing" ? "Describe what you want to accomplish." : ready ? "Your plan is ready." : stageInfo.line;
  const progress = ready
    ? 1
    : phase === "streaming"
      ? Math.min(0.96, ((stage ? stageIndex(stage) : 0) + Math.min(1, draft.tasks.length / 12)) / STAGES.length)
      : 0;

  return (
    <div ref={ref} className="flex w-full flex-col items-center gap-5" aria-label="Forma planning a half marathon, replayed">
      {/* The prompt, as typed into the product. */}
      <div className="glass flex w-full max-w-[720px] items-center gap-3 rounded-2xl px-4 py-3 sm:px-5" aria-hidden>
        <p className="min-h-[1.5em] flex-1 text-left text-[15px] text-fg">
          {DEMO_PROMPT.slice(0, typed)}
          {phase === "typing" && (
            <span className="ml-px inline-block h-[1.1em] w-px translate-y-[3px] animate-pulse bg-accent" />
          )}
        </p>
        <span
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
            phase === "typing" ? "bg-surface-2 text-fg-subtle" : "bg-fg text-bg"
          }`}
        >
          <CornerDownLeft className="size-4" />
        </span>
      </div>

      <section
        style={{ borderRadius: 28 }}
        className="glass relative w-full max-w-[1080px] overflow-hidden text-left"
        aria-hidden
      >
        <AnimatePresence>
          {ready && (
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-accent"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.4, ease: ease.out }}
            />
          )}
        </AnimatePresence>

        <header className="flex h-12 items-center justify-between border-b border-glass-edge px-5">
          <StatusIndicator label={indicator.label} state={indicator.state} />
          <span className="text-xs text-fg-subtle">{LOCAL_MODEL.label} · on device</span>
        </header>

        <div className="grid md:grid-cols-[252px_minmax(0,1fr)]">
          <aside className="hidden border-r border-glass-edge px-6 py-7 md:block">
            <StageList stage={phase === "typing" ? null : stage} complete={ready} />
          </aside>
          <div
            ref={feedRef}
            className="relative h-[420px] overflow-hidden px-4 py-6 no-scrollbar sm:px-7 sm:py-7 md:h-[660px] max-md:overflow-y-auto max-md:[mask-image:linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-24px),transparent)]"
          >
            <PlanGraph draft={draft} streaming={phase === "streaming"} />
          </div>
        </div>

        <footer className="relative flex h-12 items-center gap-4 border-t border-glass-edge px-5">
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={line}
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
            {draft.phases.length > 0 &&
              `${draft.phases.length} phases · ${draft.tasks.length} tasks${
                draft.milestones.length ? ` · ${draft.milestones.length} milestones` : ""
              }`}
          </p>
          <motion.span
            className="absolute inset-x-0 top-0 h-px origin-left bg-accent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress, opacity: ready ? 0 : 0.7 }}
            transition={{ duration: 0.8, ease: ease.expo }}
          />
        </footer>
      </section>
    </div>
  );
}
