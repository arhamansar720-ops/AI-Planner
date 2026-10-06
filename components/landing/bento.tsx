"use client";

import { motion, useInView } from "framer-motion";
import { Check, Lock, Mic, Undo2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

/**
 * Features as a bento grid of real interface fragments. Every tile has the
 * same anatomy: a live visual on top, then a short title and one sentence.
 */
export function Bento() {
  return (
    <div className="mx-auto grid max-w-[1120px] gap-4 px-4 md:grid-cols-6 md:grid-rows-[auto_auto_auto]">
      <Tile className="md:col-span-4" title="A calendar that schedules itself" body="Effort is spread over your working days, inside your daily limit and around the days you can’t work.">
        <CalendarFill />
      </Tile>
      <Tile className="md:col-span-2" title="Private by design" body="The model runs on your graphics chip. Your goals aren’t sent to an AI provider.">
        <PrivacyLog />
      </Tile>
      <Tile className="md:col-span-2" title="Dependencies move together" body="Push a task and everything that depends on it follows. Nothing starts before it can.">
        <DependencyShift />
      </Tile>
      <Tile className="md:col-span-2" title="Talk to it, hear it back" body="Dictate a goal, and have answers read aloud in a voice you pick.">
        <VoiceWave />
      </Tile>
      <Tile className="md:col-span-2" title="Undo anything" body="Every change, from a checkbox to a new deadline, can be taken back.">
        <UndoToast />
      </Tile>
      <Tile className="md:col-span-6" title="An assistant that edits the plan" body="Ask in plain words. It changes the real plan, not just the conversation, and shows you exactly what moved." wide>
        <AssistantExchange />
      </Tile>
    </div>
  );
}

function Tile({
  title,
  body,
  children,
  className,
  wide,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: ease.expo }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_1px_0_var(--glass-highlight)_inset]",
        wide && "md:flex-row-reverse md:items-stretch",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex min-h-[200px] items-center justify-center overflow-hidden border-b border-border bg-[radial-gradient(120%_100%_at_50%_0%,var(--accent-soft),transparent_70%)] p-6",
          wide && "md:min-h-0 md:flex-[1.4] md:border-b-0 md:border-l",
        )}
        aria-hidden
      >
        {children}
      </div>
      <div className={cn("p-6", wide && "md:flex md:flex-1 md:flex-col md:justify-center md:p-10")}>
        <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{title}</h3>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-fg-muted">{body}</p>
      </div>
    </motion.article>
  );
}

/** Loops while visible, so idle tiles cost nothing. */
function useLoop(ref: React.RefObject<HTMLElement | null>, steps: number, ms: number) {
  const inView = useInView(ref, { amount: 0.4 });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => window.clearInterval(t);
  }, [inView, steps, ms]);
  return step;
}

/* Calendar ------------------------------------------------------------------ */

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const BLOCKS: [day: number, top: number, height: number, label: string][] = [
  [0, 10, 30, "Outline"],
  [1, 10, 22, "Sources"],
  [1, 40, 22, "Notes"],
  [2, 18, 34, "Draft intro"],
  [3, 10, 30, "Draft §2"],
  [4, 26, 26, "Edit"],
];

function CalendarFill() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useLoop(ref, BLOCKS.length + 4, 600);
  return (
    <div ref={ref} className="w-full max-w-[560px]">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK.map((d, col) => {
          const off = col >= 5;
          return (
            <div key={d} className="flex flex-col gap-1.5">
              <p className={cn("text-center font-mono text-[10.5px]", off ? "text-fg-subtle/60" : "text-fg-subtle")}>{d}</p>
              <div
                className={cn(
                  "relative h-40 rounded-lg border border-border",
                  off ? "bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_7px)]" : "bg-bg/70",
                )}
              >
                {BLOCKS.map(([day, top, height, label], i) =>
                  day === col ? (
                    <motion.div
                      key={label}
                      initial={false}
                      animate={{ opacity: i < step ? 1 : 0, scale: i < step ? 1 : 0.85 }}
                      transition={{ type: "spring", stiffness: 380, damping: 26 }}
                      className="absolute inset-x-1 rounded-md bg-accent px-1.5 py-1 text-accent-fg shadow-sm"
                      style={{ top: `${top}%`, height: `${height}%` }}
                    >
                      <p className="truncate text-[10px] font-medium">{label}</p>
                    </motion.div>
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center font-mono text-[10.5px] text-fg-subtle">60 min a day · weekends off</p>
    </div>
  );
}

/* Privacy ------------------------------------------------------------------- */

function PrivacyLog() {
  const rows = [
    ["model", "Qwen3 4B · WebGPU"],
    ["runs on", "this device"],
    ["AI provider calls", "0"],
  ];
  return (
    <div className="w-full max-w-[280px] rounded-xl border border-border bg-bg/80 p-3 font-mono text-[11.5px] shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-fg-muted">
        <Lock className="size-3 text-accent" /> on-device
      </p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between border-t border-border py-1.5 text-fg-subtle">
          <span>{k}</span>
          <span className="text-fg">{v}</span>
        </p>
      ))}
    </div>
  );
}

/* Dependencies -------------------------------------------------------------- */

function DependencyShift() {
  const ref = useRef<HTMLDivElement>(null);
  const shifted = useLoop(ref, 2, 1800) === 1;
  const bars = [
    { label: "Research", start: 0, width: 34 },
    { label: "Draft", start: 36, width: 30 },
    { label: "Edit", start: 68, width: 24 },
  ];
  return (
    <div ref={ref} className="w-full max-w-[280px]">
      {bars.map((b, i) => (
        <div key={b.label} className="relative mb-2 h-7 rounded-md bg-bg/60 ring-1 ring-inset ring-border">
          <motion.div
            className="absolute inset-y-1 flex items-center rounded bg-accent px-2 text-[10.5px] font-medium text-accent-fg"
            initial={false}
            // Research grows by two days; the tasks that depend on it shift right.
            animate={{ left: `${b.start + (shifted && i > 0 ? 8 : 0)}%`, width: `${b.width + (shifted && i === 0 ? 8 : 0)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 24, delay: i * 0.08 }}
          >
            {b.label}
          </motion.div>
        </div>
      ))}
      <p className="mt-1 text-center font-mono text-[10.5px] text-fg-subtle">{shifted ? "Research +2 days → 2 tasks follow" : "On schedule"}</p>
    </div>
  );
}

/* Voice --------------------------------------------------------------------- */

function VoiceWave() {
  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-4">
      <div className="flex h-12 items-center gap-[3px]">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className="voice-bar w-[3px] rounded-full bg-accent"
            style={{ height: `${25 + ((i * 53) % 75)}%`, animationDelay: `${(i % 7) * 0.11}s`, opacity: 0.35 + ((i * 17) % 60) / 100 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-fg shadow-sm">
          <Mic className="size-4" />
        </span>
        <span className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[12px] font-medium text-fg-muted">
          <Volume2 className="size-3.5" /> Samantha · Normal
        </span>
      </div>
    </div>
  );
}

/* Undo ---------------------------------------------------------------------- */

function UndoToast() {
  const ref = useRef<HTMLDivElement>(null);
  const undone = useLoop(ref, 2, 2000) === 1;
  return (
    <div ref={ref} className="flex w-full max-w-[280px] flex-col gap-2.5">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-bg/80 px-3 py-2.5 text-[12.5px]">
        <motion.span
          animate={{ backgroundColor: undone ? "rgba(0,0,0,0)" : "var(--accent)", borderColor: undone ? "var(--border-strong)" : "var(--accent)" }}
          className="flex size-4 items-center justify-center rounded-full border"
        >
          {!undone && <Check className="size-2.5 text-accent-fg" strokeWidth={3} />}
        </motion.span>
        <span className={cn("transition-colors", undone ? "text-fg" : "text-fg-subtle line-through")}>Book the venue</span>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-fg px-3 py-2.5 text-[12px] text-bg shadow-md">
        <span className="flex-1">{undone ? "Change undone" : "Task completed"}</span>
        <span className="inline-flex items-center gap-1 font-medium opacity-80">
          <Undo2 className="size-3" /> ⌘Z
        </span>
      </div>
    </div>
  );
}

/* Assistant ----------------------------------------------------------------- */

function AssistantExchange() {
  return (
    <div className="flex w-full max-w-[520px] flex-col gap-2.5 text-[13px]">
      <span className="self-end rounded-2xl rounded-br-md bg-fg px-3.5 py-2 text-bg">I can’t work Fridays, and push the launch two weeks.</span>
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-2.5 text-fg-muted shadow-xs">
        Done. Fridays are blocked and the launch is now <b className="font-semibold text-fg">June 14</b>. 11 sessions moved; your
        milestones still fit.
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {["Blocked weekdays · Fri", "Deadline · Jun 14", "11 sessions rescheduled"].map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              <Check className="size-3" strokeWidth={2.5} /> {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
