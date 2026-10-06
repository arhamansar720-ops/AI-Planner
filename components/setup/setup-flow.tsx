"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { PressTile } from "@/components/ui/press-tile";
import { useToast } from "@/components/ui/toast";
import { VoicePicker } from "@/components/voice/voice-picker";
import type { PlanningStyle } from "@/lib/config";
import { ease } from "@/lib/motion";
import { getPersona, PERSONAS, type PersonaId } from "@/lib/personas";
import { formatMinutes, weekdayNames } from "@/lib/planning/dates";
import { stopSpeaking, useVoices, useVoiceSettings } from "@/lib/voice/speech";
import { voiceDisplay } from "@/lib/voice/text";

type Choices = {
  persona: PersonaId | null;
  dailyMinutes: number;
  planningStyle: PlanningStyle;
  blockedWeekdays: number[];
};

const TIME = [
  { minutes: 30, emoji: "☕", label: "30 minutes", hint: "A coffee break" },
  { minutes: 60, emoji: "⏱️", label: "An hour", hint: "A solid block" },
  { minutes: 90, emoji: "📘", label: "90 minutes", hint: "Deep progress" },
  { minutes: 180, emoji: "🔥", label: "Three hours+", hint: "Top priority" },
] as const;

const PACE = [
  { id: "gentle", emoji: "🐢", label: "Gentle", hint: "Light days, lots of buffer" },
  { id: "balanced", emoji: "⚖️", label: "Balanced", hint: "Steady and realistic" },
  { id: "ambitious", emoji: "⚡", label: "Ambitious", hint: "Tighter timelines" },
] as const;

const STEPS = ["mode", "time", "voice", "done"] as const;

const nearestTime = (m: number) =>
  TIME.reduce((best, t) => (Math.abs(t.minutes - m) < Math.abs(best.minutes - m) ? t : best)).minutes;

/**
 * First-run setup: who you are, how much time you have, and how Forma should
 * sound. Each step is a set of physical keys; choices save at the end.
 */
export function SetupFlow({ name, returning, initial }: { name: string; returning: boolean; initial: Choices }) {
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotionConfig();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [choices, setChoices] = useState<Choices>({ ...initial, dailyMinutes: nearestTime(initial.dailyMinutes) });
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const touchedTime = useRef(returning);
  const advanceTimer = useRef<number | null>(null);

  const go = (to: number) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    stopSpeaking();
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  const persist = async (values: Choices) => {
    setSave("saving");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    setSave(res?.ok ? "saved" : "error");
    return Boolean(res?.ok);
  };

  const pickPersona = (id: PersonaId) => {
    const p = getPersona(id)!;
    setChoices((c) => ({
      ...c,
      persona: id,
      // Until someone sets their own time, propose the mode's defaults.
      ...(touchedTime.current
        ? {}
        : {
            dailyMinutes: nearestTime(p.defaults.dailyMinutes),
            planningStyle: p.defaults.planningStyle,
            blockedWeekdays: [...p.defaults.blockedWeekdays],
          }),
    }));
    // Let the key finish its press before moving on.
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go(1), reduce ? 150 : 650);
  };

  const finish = async () => {
    if (save !== "saved" && !(await persist(choices))) {
      toast({ message: "Couldn’t save your setup. Please try again.", tone: "error" });
      return;
    }
    router.push("/app");
    router.refresh();
  };

  const skip = async () => {
    if (returning) {
      stopSpeaking();
      router.push("/settings");
      return;
    }
    if (await persist(choices)) {
      router.push("/app");
      router.refresh();
    } else toast({ message: "Couldn’t save your setup. Please try again.", tone: "error" });
  };

  const first = name.split(/\s+/)[0];
  const current = STEPS[step];

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="app-grain pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="app-backdrop app-backdrop-mask absolute inset-0" />
      </div>
      <div
        className="pointer-events-none fixed left-1/2 top-[30%] -z-10 h-[420px] w-[760px] max-w-full -translate-x-1/2 rounded-full bg-accent opacity-[0.06] blur-[120px] dark:opacity-[0.12]"
        aria-hidden
      />

      <header className="mx-auto flex h-16 w-full max-w-[920px] items-center gap-4 px-4 sm:px-6">
        <Wordmark />
        <Progress step={step} />
        {current !== "done" ? (
          <button
            type="button"
            onClick={skip}
            disabled={save === "saving"}
            className="ml-auto rounded-lg px-2 py-1 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            {returning ? "Cancel" : "Skip setup"}
          </button>
        ) : (
          <span className="ml-auto" />
        )}
      </header>

      <main id="main" className="mx-auto flex w-full max-w-[920px] flex-1 flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : 48 * d, filter: "blur(6px)" }),
              center: { opacity: 1, x: 0, filter: "blur(0px)" },
              exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : -48 * d, filter: "blur(6px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: ease.expo }}
            className="flex flex-1 flex-col"
            aria-labelledby={`step-${current}`}
          >
            {current === "mode" && (
              <>
                <StepHeading
                  id="step-mode"
                  eyebrow={returning ? "Your mode" : `Welcome${first ? `, ${first}` : ""} 👋`}
                  title="What are you planning for?"
                  lede="Forma tailors its plans, pacing and suggestions to you. You can change this any time in Settings."
                />
                <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {PERSONAS.map((p, i) => (
                    <Appear key={p.id} index={i}>
                      <PressTile
                        emoji={p.emoji}
                        label={p.label}
                        hint={p.blurb}
                        selected={choices.persona === p.id}
                        onClick={() => pickPersona(p.id)}
                      />
                    </Appear>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChoices((c) => ({ ...c, persona: null }));
                    go(1);
                  }}
                  className="mx-auto mt-6 rounded-lg px-2 py-1 text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  None of these fit? Continue without a mode
                </button>
              </>
            )}

            {current === "time" && (
              <>
                <StepHeading
                  id="step-time"
                  eyebrow={choices.persona ? `${getPersona(choices.persona)!.emoji} ${getPersona(choices.persona)!.label}` : "Your time"}
                  title="How much time do you have?"
                  lede="Forma schedules work around this. Each plan can still have its own pace."
                />
                <div className="flex flex-col gap-8">
                  <Field label="On a typical day">
                    <div role="radiogroup" aria-label="Time per day" className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {TIME.map((t, i) => (
                        <Appear key={t.minutes} index={i}>
                          <PressTile
                            size="md"
                            emoji={t.emoji}
                            label={t.label}
                            hint={t.hint}
                            selected={choices.dailyMinutes === t.minutes}
                            onClick={() => {
                              touchedTime.current = true;
                              setChoices((c) => ({ ...c, dailyMinutes: t.minutes }));
                            }}
                          />
                        </Appear>
                      ))}
                    </div>
                  </Field>
                  <Field label="Pace">
                    <div role="radiogroup" aria-label="Pace" className="grid gap-3 sm:grid-cols-3">
                      {PACE.map((p, i) => (
                        <Appear key={p.id} index={i + 4}>
                          <PressTile
                            size="md"
                            emoji={p.emoji}
                            label={p.label}
                            hint={p.hint}
                            selected={choices.planningStyle === p.id}
                            onClick={() => {
                              touchedTime.current = true;
                              setChoices((c) => ({ ...c, planningStyle: p.id }));
                            }}
                          />
                        </Appear>
                      ))}
                    </div>
                  </Field>
                  <Field label="Days off" hint="Forma won’t schedule work on these days.">
                    <div role="group" aria-label="Days off" className="grid max-w-[460px] grid-cols-7 gap-2">
                      {weekdayNames.short.map((n, d) => {
                        const off = choices.blockedWeekdays.includes(d);
                        return (
                          <PressTile
                            key={n}
                            size="sm"
                            role="checkbox"
                            label={n.slice(0, 2)}
                            selected={off}
                            disabled={!off && choices.blockedWeekdays.length >= 6}
                            onClick={() => {
                              touchedTime.current = true;
                              setChoices((c) => ({
                                ...c,
                                blockedWeekdays: off ? c.blockedWeekdays.filter((x) => x !== d) : [...c.blockedWeekdays, d].sort(),
                              }));
                            }}
                          />
                        );
                      })}
                    </div>
                  </Field>
                </div>
              </>
            )}

            {current === "voice" && (
              <>
                <StepHeading
                  id="step-voice"
                  eyebrow="Voice"
                  title="Give Forma a voice"
                  lede="Press a voice to hear it. They’re built into your device, so they’re free and nothing extra downloads."
                />
                <VoicePicker />
              </>
            )}

            {current === "done" && <Done choices={choices} name={first} save={save} onStart={finish} />}

            {current !== "done" && (
              <nav className="mt-auto flex items-center justify-between gap-3 pt-10" aria-label="Setup steps">
                {step > 0 ? (
                  <Button variant="ghost" onClick={() => go(step - 1)}>
                    <ArrowLeft /> Back
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-full px-6"
                  disabled={current === "mode" && !choices.persona}
                  onClick={() => {
                    go(step + 1);
                    // Save while the last step celebrates, so "Start planning" is instant.
                    if (current === "voice") void persist(choices);
                  }}
                >
                  {current === "voice" ? "Finish" : "Continue"} <ArrowRight />
                </Button>
              </nav>
            )}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div
      className="mx-auto flex w-full max-w-[220px] gap-1.5"
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={step + 1}
    >
      {STEPS.map((s, i) => (
        <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-border-strong">
          <motion.span
            className="block h-full origin-left rounded-full bg-accent"
            initial={false}
            animate={{ scaleX: i <= step ? 1 : 0 }}
            transition={{ duration: 0.5, ease: ease.expo }}
          />
        </span>
      ))}
    </div>
  );
}

function StepHeading({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede: string }) {
  return (
    <div className="mb-8 sm:mb-10">
      <p className="text-[13px] font-medium text-accent">{eyebrow}</p>
      <h1 id={id} className="mt-2 text-balance text-[clamp(1.9rem,4.6vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
        {title}
      </h1>
      <p className="mt-3 max-w-[560px] text-pretty text-[15.5px] leading-relaxed text-fg-muted">{lede}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[13px] font-medium text-fg">
        {label}
        {hint && <span className="ml-2 font-normal text-fg-subtle">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

function Appear({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.08 + index * 0.05, ease: ease.expo }}
    >
      {children}
    </motion.div>
  );
}

function Done({
  choices,
  name,
  save,
  onStart,
}: {
  choices: Choices;
  name: string;
  save: "idle" | "saving" | "saved" | "error";
  onStart: () => void;
}) {
  const reduce = useReducedMotionConfig();
  const persona = getPersona(choices.persona);
  const voice = useVoiceSettings();
  const voices = useVoices();
  const voiceName = voice.enabled
    ? voiceDisplay(voices.find((v) => v.voiceURI === voice.voiceURI) ?? voices[0] ?? { name: "Default", lang: "" }).name
    : null;
  const emoji = persona?.emoji ?? "✨";
  const summary = [
    persona && `${persona.emoji} ${persona.label}`,
    `⏱️ ${formatMinutes(choices.dailyMinutes)} a day`,
    `${PACE.find((p) => p.id === choices.planningStyle)?.emoji} ${PACE.find((p) => p.id === choices.planningStyle)?.label}`,
    choices.blockedWeekdays.length ? `🛌 Off ${choices.blockedWeekdays.map((d) => weekdayNames.short[d]).join(", ")}` : null,
    voiceName ? `🎙️ ${voiceName}` : "🔇 No voice",
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
      <div className="relative mb-8 flex size-36 items-center justify-center">
        {!reduce &&
          Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                aria-hidden
                className="absolute text-[20px]"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{
                  x: Math.cos(angle) * (90 + (i % 3) * 18),
                  y: Math.sin(angle) * (90 + (i % 3) * 18),
                  opacity: [0, 1, 0],
                  scale: [0.4, 1, 0.8],
                  rotate: (i % 2 ? 1 : -1) * 40,
                }}
                transition={{ duration: 1.3, delay: 0.25, ease: ease.out }}
              >
                {i % 3 === 0 ? emoji : "✨"}
              </motion.span>
            );
          })}
        <motion.span
          className="absolute inset-0 rounded-full bg-accent-soft"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          aria-hidden
        />
        <motion.span
          className="relative text-[76px] leading-none"
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.1 }}
          aria-hidden
        >
          {emoji}
        </motion.span>
      </div>
      <motion.h1
        id="step-done"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: ease.expo }}
        className="text-balance text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em]"
      >
        You’re all set{name ? `, ${name}` : ""}.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: ease.expo }}
        className="mt-3 max-w-[460px] text-[15.5px] text-fg-muted"
      >
        Tell Forma what you want to accomplish and watch the plan take shape.
      </motion.p>
      <motion.ul
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.5 } } }}
        className="mt-7 flex max-w-[560px] flex-wrap justify-center gap-2"
        aria-label="Your choices"
      >
        {summary.map((s) => (
          <motion.li
            key={s}
            variants={{ hidden: { opacity: 0, y: 8, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
            className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] text-fg shadow-xs"
          >
            {s}
          </motion.li>
        ))}
      </motion.ul>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.75, ease: ease.expo }}
        className="mt-10 w-full max-w-[280px]"
      >
        <PressTile size="md" role="button" tone="accent" emoji="✨" label="Start planning" disabled={save === "saving"} onClick={onStart} />
        {save === "error" && <p className="mt-3 text-[13px] text-danger">Couldn’t save. Press again to retry.</p>}
      </motion.div>
    </div>
  );
}
