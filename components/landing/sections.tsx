"use client";

import { motion } from "framer-motion";
import {
  CalendarClock,
  GitBranch,
  History,
  Lock,
  MessageSquareText,
  PenLine,
  Sparkles,
  Undo2,
  Workflow,
} from "lucide-react";
import LogoLoop from "@/components/reactbits/LogoLoop";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

/** Eyebrow, title and lede for a section, revealed as it scrolls in. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  id,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  id?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: ease.expo }}
      className="mx-auto mb-12 flex max-w-[640px] flex-col items-center text-center sm:mb-14"
    >
      <p className="mb-3 text-[13px] font-medium text-accent">{eyebrow}</p>
      <h2 id={id} className="text-balance text-[clamp(1.9rem,4.4vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
        {title}
      </h2>
      {lede && <p className="mt-4 text-balance text-[16px] leading-relaxed text-fg-muted">{lede}</p>}
    </motion.div>
  );
}

/* Goals marquee -------------------------------------------------------------- */

const GOAL_CHIPS = [
  "Write my thesis by May",
  "Launch the beta in 8 weeks",
  "Run a half marathon",
  "Move to Lisbon",
  "Learn conversational Spanish",
  "Renovate the kitchen",
  "Apply to five grad schools",
  "Ship the redesign",
  "Plan the wedding",
  "Pass the bar exam",
  "Start a podcast",
  "Get AWS certified",
];

export function GoalsMarquee() {
  return (
    <div className="py-6">
      <p className="mb-5 text-center text-[13px] text-fg-subtle">People plan all kinds of things with Forma</p>
      <LogoLoop
        logos={GOAL_CHIPS.map((goal) => ({
          node: (
            <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-[14px] text-fg-muted shadow-xs">
              <span className="size-1.5 rounded-full bg-accent/70" aria-hidden />
              {goal}
            </span>
          ),
          title: goal,
        }))}
        speed={40}
        gap={12}
        logoHeight={36}
        pauseOnHover
        fadeOut
        fadeOutColor="var(--bg)"
        ariaLabel="Example goals"
      />
    </div>
  );
}

/* How it works ---------------------------------------------------------------- */

const STEPS = [
  {
    icon: PenLine,
    title: "Say what you want",
    body: "A sentence is enough. Add a deadline, notes or a file if you have them, or let Forma ask one quick question.",
  },
  {
    icon: Sparkles,
    title: "Watch it take shape",
    body: "Phases, tasks, dependencies and milestones appear as the model writes them, on a canvas you can read along with.",
  },
  {
    icon: CalendarClock,
    title: "Work the plan",
    body: "Your plan becomes a workspace: a timeline, a calendar of work sessions and a task list that reschedules itself.",
  },
];

export function HowItWorks() {
  return (
    <ol className="mx-auto grid max-w-[1080px] gap-4 md:grid-cols-3">
      {STEPS.map((step, i) => (
        <motion.li
          key={step.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: i * 0.1, ease: ease.expo }}
          className="glass relative rounded-3xl p-7"
        >
          <div className="mb-10 flex items-center justify-between">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <step.icon className="size-5" />
            </span>
            <span className="font-mono text-[13px] text-fg-subtle">0{i + 1}</span>
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{step.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{step.body}</p>
        </motion.li>
      ))}
    </ol>
  );
}

/* Features -------------------------------------------------------------------- */

const FEATURES = [
  {
    icon: Lock,
    title: "Private, on-device AI",
    body: "Forma runs an 8-billion-parameter model on your own graphics chip. No AI provider ever sees your goals.",
    wide: true,
    visual: <DeviceVisual />,
  },
  {
    icon: CalendarClock,
    title: "A calendar that schedules itself",
    body: "Effort is spread across your working days, within your daily limit and around the days you can’t work.",
  },
  {
    icon: GitBranch,
    title: "Dependencies move together",
    body: "Drag a task and everything that depends on it shifts with it. Nothing starts before it can.",
  },
  {
    icon: MessageSquareText,
    title: "An assistant that edits the plan",
    body: "“I can’t work Fridays.” “Push the launch two weeks.” It changes the plan itself, and every change can be undone.",
    wide: true,
    visual: <ChatVisual />,
  },
  {
    icon: Workflow,
    title: "A living timeline",
    body: "Phases, milestones and today’s marker on one strip, always in sync with the tasks underneath.",
  },
  {
    icon: Undo2,
    title: "Nothing is permanent",
    body: "Every edit, from a checkbox to a new deadline, has an undo.",
  },
  {
    icon: History,
    title: "Every plan, kept",
    body: "Come back to any plan, export it, or start a new one with an old one as context.",
  },
];

export function Features() {
  return (
    <div className="mx-auto grid max-w-[1080px] gap-4 md:grid-cols-3">
      {FEATURES.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: (i % 3) * 0.08, ease: ease.expo }}
          className={cn(f.wide && "md:col-span-2")}
        >
          <SpotlightCard className="h-full">
            <div className={cn("flex h-full flex-col gap-6", f.wide && "sm:flex-row sm:items-center")}>
              <div className="flex-1">
                <span className="mb-5 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg">
                  <f.icon className="size-[18px]" />
                </span>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{f.body}</p>
              </div>
              {f.visual && <div className="sm:w-[46%]">{f.visual}</div>}
            </div>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  );
}

function DeviceVisual() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface-2 p-4 font-mono text-[12px] text-fg-muted" aria-hidden>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-fg">Qwen3 8B</span>
        <span className="inline-flex items-center gap-1.5 text-accent">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> WebGPU
        </span>
      </div>
      {[
        ["Model cached", "in this browser"],
        ["Network calls", "0 to AI providers"],
        ["Context", "8,192 tokens"],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between border-t border-border py-2">
          <span>{k}</span>
          <span className="text-fg">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="flex flex-col gap-2 text-[13px]" aria-hidden>
      <span className="self-end rounded-2xl rounded-br-md bg-fg px-3.5 py-2 text-bg">I can’t work Fridays.</span>
      <span className="max-w-[90%] rounded-2xl rounded-bl-md border border-border bg-surface-2 px-3.5 py-2 text-fg-muted">
        Done. Fridays are blocked and 6 sessions moved to Mondays and Thursdays.
      </span>
      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent-soft px-2.5 py-1 text-[12px] text-accent">
        <CalendarClock className="size-3.5" /> Blocked weekdays · Fri
      </span>
    </div>
  );
}
