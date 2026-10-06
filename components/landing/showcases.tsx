"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, CalendarPlus, Mic, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import BlurText from "@/components/reactbits/BlurText";
import { PALETTES, setAppearance, useAppearance } from "@/components/shell/appearance";
import { PressTile } from "@/components/ui/press-tile";
import { PROVIDERS } from "@/lib/connections/providers";
import { ease } from "@/lib/motion";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "./sections";
import { speak, speechSupported, stopSpeaking, useSpeakingId } from "@/lib/voice/speech";

const noop = () => () => {};

/* Page header ------------------------------------------------------------------ */

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return (
    <header className="relative isolate px-4 pb-16 pt-16 sm:pb-24 sm:pt-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_30%_20%,black,transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-[1120px]">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.expo }}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </motion.div>
        <h1 className="mt-5 max-w-[16ch] text-balance text-[clamp(2.5rem,6vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
          <BlurText as="span" text={title} delay={60} animateBy="words" direction="top" />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: ease.expo }}
          className="mt-6 max-w-[560px] text-pretty text-[18px] leading-[1.6] text-fg-muted"
        >
          {lede}
        </motion.p>
      </div>
    </header>
  );
}

/* Reveal helper -------------------------------------------------------------- */

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, delay, ease: ease.expo }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A two-column feature row: copy on one side, a live visual on the other. */
export function FeatureRow({
  id,
  eyebrow,
  title,
  body,
  points,
  visual,
  flip,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  points?: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-4 py-14 sm:py-20">
      <div className={cn("mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-2 lg:gap-16", flip && "lg:[&>*:first-child]:order-2")}>
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-4 text-balance text-[clamp(1.9rem,3.6vw,2.7rem)] font-semibold leading-[1.06] tracking-[-0.04em]">{title}</h2>
          <p className="mt-4 text-pretty text-[16px] leading-relaxed text-fg-muted">{body}</p>
          {points && (
            <ul className="mt-6 flex flex-col gap-2.5">
              {points.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] text-fg">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </Reveal>
        <Reveal delay={0.1}>{visual}</Reveal>
      </div>
    </section>
  );
}

/* Modes ------------------------------------------------------------------------ */

const EXAMPLE_GOALS: Record<PersonaId, string> = {
  student: "Ace my AP Bio exam on May 12",
  professional: "Ship the Q3 analytics dashboard",
  founder: "Launch the beta to 100 users",
  creator: "Publish a video every week this fall",
  athlete: "Run a sub-25 minute 5K",
  home: "Move to Denver by August",
};

/** Press a mode: the prompt, suggestions and planning approach change with it. */
export function ModesShowcase() {
  const [mode, setMode] = useState<PersonaId>("student");
  const persona = PERSONAS.find((p) => p.id === mode)!;

  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
      <div role="radiogroup" aria-label="Try a mode" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PERSONAS.map((p) => (
          <PressTile key={p.id} size="md" emoji={p.emoji} label={p.label} selected={mode === p.id} onClick={() => setMode(p.id)} />
        ))}
      </div>
      <div className="glass relative overflow-hidden rounded-[28px] p-5 sm:p-6" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: ease.expo }}
          >
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
              <span className="text-[20px]" aria-hidden>
                {persona.emoji}
              </span>
              Planning as a {persona.label.toLowerCase()}
            </p>
            <div className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="min-h-[3em] text-[16px] text-fg">{EXAMPLE_GOALS[mode]}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-fg-subtle">+ Add context</span>
                <span className="flex items-center gap-1.5">
                  <span className="flex size-8 items-center justify-center rounded-full text-fg-subtle">
                    <Mic className="size-4" />
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-fg text-bg">
                    <ArrowUp className="size-4" />
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {persona.suggestions.map((s) => (
                <span key={s.label} className="rounded-full border border-border bg-surface/70 px-3 py-1 text-[12.5px] text-fg-muted">
                  {s.label}
                </span>
              ))}
            </div>
            <p className="mt-5 text-[14px] leading-relaxed text-fg-muted">
              <span className="font-medium text-fg">How Forma plans: </span>
              {persona.guidance.replace(/^The person is [^.]+\.\s*/, "")}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Voice ------------------------------------------------------------------------ */

export function VoiceVisual() {
  const supported = useSyncExternalStore(noop, speechSupported, () => false);
  const speaking = useSpeakingId() === "landing-sample";
  const sample =
    "Here’s your plan for today. Start with the biology flashcards, about thirty minutes. Then outline your essay before dinner. You’re on track for Friday.";

  return (
    <div className="glass rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-3 text-[14px]">
        <span className="self-end rounded-2xl rounded-br-md bg-fg px-4 py-2.5 text-bg">What should I do today?</span>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3 text-fg-muted shadow-xs">
          Start with the <b className="font-semibold text-fg">biology flashcards</b> (30 min), then outline your essay before dinner.
          You’re on track for Friday.
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={!supported}
              onClick={() => (speaking ? stopSpeaking() : speak(sample, { id: "landing-sample", overrides: { enabled: true } }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
                speaking ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent hover:bg-accent hover:text-accent-fg",
              )}
            >
              <Volume2 className="size-3.5" /> {speaking ? "Stop" : "Hear it"}
            </button>
            <span className="flex h-4 items-center gap-[3px]" aria-hidden>
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className={cn("w-[3px] rounded-full bg-accent/60", speaking ? "voice-bar" : "")}
                  style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 5) * 0.12}s` }}
                />
              ))}
            </span>
          </div>
        </div>
        <span className="mt-1 inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-fg-muted">
          <Mic className="size-3.5 text-accent" /> Or just say your goal out loud
        </span>
      </div>
    </div>
  );
}

/* Connections ------------------------------------------------------------------ */

export function ConnectionsVisual() {
  return (
    <div className="glass relative overflow-hidden rounded-[28px] p-6">
      <div className="grid grid-cols-3 gap-3">
        {PROVIDERS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-4 shadow-xs"
          >
            <span
              className="flex size-10 items-center justify-center rounded-xl text-[17px] font-bold text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]"
              style={{ background: p.color }}
              aria-hidden
            >
              {p.name[0]}
            </span>
            <span className="text-center text-[12.5px] font-medium leading-tight">{p.name}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-[13px]">
        <CalendarPlus className="size-4 shrink-0 text-accent" aria-hidden />
        <span className="text-fg-muted">
          <span className="font-medium text-fg">Bio lab report</span> due Thu · <span className="font-medium text-fg">Unit 4 quiz</span> Mon · planned
          around automatically
        </span>
      </div>
    </div>
  );
}

/* Themes ----------------------------------------------------------------------- */

/** Real color themes: picking one recolors this page (and is remembered on this device). */
export function ThemesVisual() {
  const { palette } = useAppearance();
  return (
    <div className="glass rounded-[28px] p-6">
      <div role="radiogroup" aria-label="Try a color theme" className="grid grid-cols-4 gap-3 sm:grid-cols-7 lg:grid-cols-4">
        {PALETTES.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={palette === p.id}
            aria-label={p.label}
            onClick={() => setAppearance({ palette: p.id })}
            whileHover={{ y: -3 }}
            whileTap={{ y: 2, scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 outline-none"
          >
            <span
              className={cn(
                "size-12 rounded-full shadow-sm transition-shadow",
                palette === p.id ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : "ring-1 ring-border-strong",
              )}
              style={{ background: `linear-gradient(135deg, ${p.swatch[0]} 0 48%, ${p.swatch[1]} 48% 100%)` }}
            />
            <span className="text-center text-[11.5px] text-fg-muted">{p.label}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[12px] text-fg-subtle">Preview</p>
        <p className="mt-1 text-[15px] font-semibold">Finals week</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <motion.div className="h-full rounded-full bg-accent" initial={{ width: "20%" }} whileInView={{ width: "64%" }} transition={{ duration: 1.2, ease: ease.expo }} />
        </div>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-accent-fg">Start session</span>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">4 tasks today</span>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-fg-subtle">Go on, try one. This whole page changes.</p>
    </div>
  );
}

/* FAQ ---------------------------------------------------------------------------- */

export function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-[760px] divide-y divide-border rounded-3xl border border-border bg-surface">
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15.5px] font-medium outline-none focus-visible:bg-surface-2 sm:px-6"
              >
                {q}
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 26 }} className="text-[20px] leading-none text-fg-subtle" aria-hidden>
                  +
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-${i}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: ease.expo }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-fg-muted sm:px-6">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
