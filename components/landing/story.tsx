"use client";

import { ProviderLogo } from "@/components/connections/provider-logo";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowUp, Check, CornerDownLeft, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROVIDERS } from "@/lib/connections/providers";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "./sections";

/** The tools Forma actually reads from, as quiet monochrome wordmarks. */
export function WorksWith() {
  return (
    <div className="mx-auto max-w-[1120px] px-4">
      <div className="flex flex-col items-center gap-6 border-y border-border py-8 sm:flex-row sm:justify-between">
        <p className="shrink-0 font-mono text-[11.5px] uppercase tracking-[0.14em] text-fg-subtle">Plans around</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-end">
          {PROVIDERS.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-fg-subtle transition-colors hover:text-fg"
            >
              <ProviderLogo id={p.id} size={22} className="opacity-80 grayscale transition-[filter,opacity] group-hover:opacity-100 group-hover:grayscale-0" />
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Say what you want",
    body: "One sentence is enough. Add a deadline, notes, a file or your school calendar, or just say it out loud.",
  },
  {
    title: "Watch it take shape",
    body: "Phases, tasks, dependencies and milestones appear as the model writes them, on a canvas you can read along with.",
  },
  {
    title: "Work the plan",
    body: "Your plan becomes a workspace: a timeline, a calendar of work sessions and an assistant that reschedules with you.",
  },
] as const;

/**
 * How it works, told while scrolling: the steps stay pinned on the left and
 * the visual on the right follows whichever step is in the middle of the screen.
 */
export function Story() {
  const [active, setActive] = useState(0);
  return (
    <div className="mx-auto grid max-w-[1120px] gap-10 px-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div>
        {STEPS.map((step, i) => (
          <StepBlock key={step.title} index={i} active={active === i} onActive={() => setActive(i)} />
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="glass relative aspect-[5/4] overflow-hidden rounded-[20px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.45, ease: ease.expo }}
                className="absolute inset-0 flex items-center justify-center p-8"
              >
                {active === 0 ? <PromptVisual /> : active === 1 ? <BuildVisual /> : <WorkspaceVisual />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBlock({ index, active, onActive }: { index: number; active: boolean; onActive: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inMiddle = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inMiddle) onActive();
  }, [inMiddle, onActive]);
  const step = STEPS[index];

  return (
    <div ref={ref} className="flex flex-col justify-center border-l border-border py-10 pl-6 lg:min-h-[52vh] lg:pl-10">
      <div className={cn("relative transition-opacity duration-500", active ? "opacity-100" : "lg:opacity-35")}>
        <span
          className={cn(
            "absolute -left-[calc(1.5rem+1px)] top-1 h-10 w-px transition-colors duration-500 lg:-left-[calc(2.5rem+1px)]",
            active ? "bg-accent" : "bg-transparent",
          )}
          aria-hidden
        />
        <Eyebrow index={`0${index + 1}`}>Step</Eyebrow>
        <h3 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.035em]">{step.title}</h3>
        <p className="mt-3 max-w-[420px] text-[16.5px] leading-[1.6] text-fg-muted">{step.body}</p>
        {/* On small screens each step carries its own visual. */}
        <div className="glass mt-8 flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[20px] p-6 lg:hidden">
          {index === 0 ? <PromptVisual /> : index === 1 ? <BuildVisual /> : <WorkspaceVisual />}
        </div>
      </div>
    </div>
  );
}

/* Visuals: small, faithful pieces of the real interface. ---------------------- */

function PromptVisual() {
  return (
    <div className="w-full max-w-[420px]" aria-hidden>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-md">
        <p className="text-[15px] leading-relaxed text-fg">
          Get me ready for my AP Bio exam on May 12. I have practice in the evenings.
          <span className="ml-px inline-block h-[1.05em] w-px translate-y-[3px] animate-pulse bg-accent" />
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11.5px] text-fg-muted">Schoology · 9 upcoming</span>
          <span className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11.5px] text-fg-muted">syllabus.md</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="flex size-8 items-center justify-center rounded-full text-fg-subtle">
              <Mic className="size-4" />
            </span>
            <span className="flex size-8 items-center justify-center rounded-full bg-fg text-bg">
              <ArrowUp className="size-4" />
            </span>
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] text-fg-subtle">
        <CornerDownLeft className="size-3" /> to plan
      </p>
    </div>
  );
}

const BUILD_TASKS = [
  ["Diagnose weak units with a practice test", "Week 1"],
  ["Review cell energetics with active recall", "Week 2"],
  ["Timed free-response set, then correct", "Week 3"],
  ["Full mock exam under real conditions", "Week 5"],
] as const;

function BuildVisual() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const t = window.setInterval(() => setShown((n) => (n >= BUILD_TASKS.length + 2 ? 1 : n + 1)), 700);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="w-full max-w-[420px]" aria-hidden>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-fg-muted">
          <span className="size-1.5 rounded-full bg-accent pulse-dot" /> Planning
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">{Math.min(shown, BUILD_TASKS.length)} / 4 tasks</span>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-md">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent">Phase 1 · Foundations</p>
        <ul className="mt-3 flex flex-col gap-2">
          {BUILD_TASKS.map(([t, w], i) => (
            <motion.li
              key={t}
              initial={false}
              animate={{ opacity: i < shown ? 1 : 0, y: i < shown ? 0 : 8, filter: i < shown ? "blur(0px)" : "blur(4px)" }}
              transition={{ duration: 0.4, ease: ease.expo }}
              className="flex items-center gap-3 rounded-xl border border-border bg-bg/60 px-3 py-2.5 text-[13px]"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-accent" />
              <span className="flex-1 text-fg">{t}</span>
              <span className="font-mono text-[11px] text-fg-subtle">{w}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SESSIONS: [number, number, number, string][] = [
  [0, 1, 2, "Practice test"],
  [1, 2, 1, "Flashcards"],
  [2, 0, 2, "Cell energetics"],
  [3, 2, 1, "Free response"],
  [4, 1, 2, "Review mistakes"],
];

function WorkspaceVisual() {
  return (
    <div className="w-full max-w-[460px]" aria-hidden>
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold">This week</p>
          <p className="font-mono text-[11px] text-fg-subtle">45 min / day</p>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {DAYS.map((d, col) => (
            <div key={d} className="flex flex-col gap-1.5">
              <p className="text-center font-mono text-[10.5px] text-fg-subtle">{d}</p>
              <div className="relative h-36 rounded-lg bg-surface-2">
                {SESSIONS.filter((s) => s[0] === col).map(([, row, span, label], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.15 + col * 0.08 + i * 0.05 }}
                    className="absolute inset-x-1 rounded-md bg-accent-soft px-1.5 py-1 ring-1 ring-inset ring-accent-line"
                    style={{ top: `${row * 30 + 6}%`, height: `${span * 28}%` }}
                  >
                    <p className="truncate text-[10px] font-medium text-accent">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 ml-auto flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] shadow-sm">
        <Check className="size-3.5 text-accent" strokeWidth={2.5} />
        Daily time set to 45 min · 3 sessions moved
        <span className="font-mono text-[11px] text-fg-subtle">⌘Z</span>
      </div>
    </div>
  );
}
