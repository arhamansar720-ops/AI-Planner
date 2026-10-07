"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Maximize2, Minimize2, Pause, Play, Plus, Square } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";
import { formatClock } from "./clock";
import { getVoiceSettings, speak } from "@/lib/voice/speech";

/**
 * The focus timer: one per browser, available on every page. Focus blocks
 * are followed by a short break; the minutes actually focused are saved to
 * the account. State lives in localStorage, so a reload or a closed tab
 * doesn't lose a running session.
 */

export type FocusTask = { planId: string; taskId: string; title: string; planTitle?: string };

type Running = {
  status: "running" | "paused";
  phase: "focus" | "break";
  task: FocusTask | null;
  lengthMs: number;
  /** When the current phase ends (running) … */
  endsAt: number;
  /** … or how much was left when paused. */
  remainingMs: number;
  /** When this focus block started, for the saved record. */
  startedAt: string;
};
type FocusState = { status: "idle" } | Running;

const KEY = "forma:focus";
const LENGTH_KEY = "forma:focus-length";
export const FOCUS_LENGTHS = [15, 25, 50] as const;
const breakFor = (focusMin: number) => (focusMin >= 50 ? 10 : 5);
export const TASK_DONE_EVENT = "forma:task-done";
export const FOCUS_SAVED_EVENT = "forma:focus-saved";

type FocusApi = {
  state: FocusState;
  remainingMs: number;
  start: (task: FocusTask | null, minutes?: number) => void;
  open: () => void;
};

const FocusContext = createContext<FocusApi | null>(null);

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside FocusProvider");
  return ctx;
}

function remaining(s: FocusState, now: number) {
  if (s.status === "idle") return 0;
  return s.status === "paused" ? s.remainingMs : Math.max(0, s.endsAt - now);
}

/** Two soft notes, made on the fly (no audio files). */
function chime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    window.setTimeout(() => void ctx.close(), 1600);
  } catch {}
}

function announce(text: string, notify: boolean) {
  chime();
  if (getVoiceSettings().enabled) speak(text, { id: "focus" });
  if (notify && document.hidden && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Forma", { body: text, tag: "forma-focus", icon: "/icon.svg" });
    } catch {}
  }
}

async function saveFocus(task: FocusTask | null, minutes: number, startedAt: string) {
  if (minutes < 1) return;
  await fetch("/api/focus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: task?.planId ?? null,
      taskId: task?.taskId ?? null,
      taskTitle: task?.title ?? "",
      minutes: Math.min(600, Math.round(minutes)),
      startedAt,
    }),
  })
    .then((res) => {
      if (res.ok) window.dispatchEvent(new Event(FOCUS_SAVED_EVENT));
    })
    .catch(() => {});
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusState>({ status: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const stateRef = useRef(state);
  const toast = useToast();

  const commit = useCallback((next: FocusState) => {
    stateRef.current = next;
    setState(next);
    try {
      if (next.status === "idle") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // Restore after a reload; a focus block that ended while away still counts.
  useEffect(() => {
    let saved: FocusState | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || "null") as FocusState | null;
    } catch {}
    if (!saved || saved.status === "idle") return;
    const expired = saved.status === "running" && saved.endsAt <= Date.now();
    if (expired && saved.phase === "focus") void saveFocus(saved.task, saved.lengthMs / 60000, saved.startedAt);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after mount
    commit(expired ? { status: "idle" } : saved);
  }, [commit]);

  const finishPhase = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle") return;
    if (s.phase === "focus") {
      const minutes = s.lengthMs / 60000;
      void saveFocus(s.task, minutes, s.startedAt);
      const breakMin = breakFor(minutes);
      announce(`Nice work. Take a ${breakMin} minute break.`, true);
      commit({ ...s, phase: "break", status: "running", lengthMs: breakMin * 60000, endsAt: Date.now() + breakMin * 60000, remainingMs: 0 });
    } else {
      announce("Break’s over. Ready when you are.", true);
      commit({ status: "idle" });
      setExpanded(false);
    }
  }, [commit]);

  // Tick while something is running, and finish phases on time.
  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      setNow(Date.now());
      if (stateRef.current.status === "running" && stateRef.current.endsAt <= Date.now()) finishPhase();
    };
    tick();
    const interval = window.setInterval(tick, 500);
    const timeout = window.setTimeout(tick, Math.max(0, state.endsAt - Date.now()) + 50);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [state, finishPhase]);

  const start = useCallback(
    (task: FocusTask | null, minutes?: number) => {
      const current = stateRef.current;
      // Starting over a running focus block saves what was done so far.
      if (current.status !== "idle" && current.phase === "focus") {
        const done = (current.lengthMs - remaining(current, Date.now())) / 60000;
        if (done >= 1) void saveFocus(current.task, done, current.startedAt);
      }
      let length = minutes;
      if (!length) {
        try {
          length = Number(localStorage.getItem(LENGTH_KEY)) || 25;
        } catch {
          length = 25;
        }
      }
      const ms = length * 60000;
      commit({ status: "running", phase: "focus", task, lengthMs: ms, endsAt: Date.now() + ms, remainingMs: 0, startedAt: new Date().toISOString() });
      setNow(Date.now());
      setExpanded(true);
    },
    [commit],
  );

  const api = useMemo<FocusApi>(
    () => ({ state, remainingMs: remaining(state, now), start, open: () => setExpanded(true) }),
    [state, now, start],
  );

  const pause = () => {
    const s = stateRef.current;
    if (s.status === "running") commit({ ...s, status: "paused", remainingMs: Math.max(0, s.endsAt - Date.now()) });
    else if (s.status === "paused") commit({ ...s, status: "running", endsAt: Date.now() + s.remainingMs });
  };

  const addFive = () => {
    const s = stateRef.current;
    if (s.status === "idle") return;
    const extra = 5 * 60000;
    commit(s.status === "running" ? { ...s, lengthMs: s.lengthMs + extra, endsAt: s.endsAt + extra } : { ...s, lengthMs: s.lengthMs + extra, remainingMs: s.remainingMs + extra });
  };

  const setLength = (min: number) => {
    const s = stateRef.current;
    if (s.status === "idle" || s.phase !== "focus") return;
    try {
      localStorage.setItem(LENGTH_KEY, String(min));
    } catch {}
    const elapsed = s.lengthMs - remaining(s, Date.now());
    const left = Math.max(1000, min * 60000 - elapsed);
    commit(s.status === "running" ? { ...s, lengthMs: min * 60000, endsAt: Date.now() + left } : { ...s, lengthMs: min * 60000, remainingMs: left });
  };

  const stop = (options: { quiet?: boolean } = {}) => {
    const s = stateRef.current;
    if (s.status === "idle") return;
    if (s.phase === "focus") {
      const done = (s.lengthMs - remaining(s, Date.now())) / 60000;
      if (done >= 1) {
        void saveFocus(s.task, done, s.startedAt);
        if (!options.quiet) toast({ message: `Saved ${Math.round(done)} focused minutes` });
      }
    }
    commit({ status: "idle" });
    setExpanded(false);
  };

  const markDone = async () => {
    const s = stateRef.current;
    if (s.status === "idle" || !s.task) return;
    const { planId, taskId, title } = s.task;
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: [{ type: "task.update", taskId, patch: { status: "done" } }] }),
    }).catch(() => null);
    if (!res?.ok) {
      toast({ message: "Couldn’t mark that task done.", tone: "error" });
      return;
    }
    window.dispatchEvent(new CustomEvent(TASK_DONE_EVENT, { detail: { planId, taskId } }));
    stop({ quiet: true });
    toast({ message: `Done: ${title}` });
  };

  // Keyboard: space pauses, Escape minimizes.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") setExpanded(false);
      if (e.key === " ") {
        e.preventDefault();
        pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <FocusContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {state.status !== "idle" && !expanded && (
          <FocusPill key="pill" state={state} remainingMs={api.remainingMs} onOpen={() => setExpanded(true)} onPause={pause} />
        )}
        {state.status !== "idle" && expanded && (
          <FocusOverlay
            key="overlay"
            state={state}
            remainingMs={api.remainingMs}
            onMinimize={() => setExpanded(false)}
            onPause={pause}
            onAddFive={addFive}
            onStop={() => stop()}
            onDone={markDone}
            onLength={setLength}
          />
        )}
      </AnimatePresence>
    </FocusContext.Provider>
  );
}

function FocusPill({ state, remainingMs, onOpen, onPause }: { state: Running; remainingMs: number; onOpen: () => void; onPause: () => void }) {
  const progress = 1 - remainingMs / state.lengthMs;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-5 left-5 z-[60] flex items-center gap-1 rounded-full border border-border-strong bg-surface p-1 pr-2 shadow-lg"
      role="region"
      aria-label="Focus timer"
    >
      <button
        type="button"
        onClick={onPause}
        aria-label={state.status === "paused" ? "Resume" : "Pause"}
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors",
          state.phase === "break" ? "bg-success-soft text-success" : "bg-accent text-accent-fg",
        )}
      >
        {state.status === "paused" ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
      </button>
      <button type="button" onClick={onOpen} className="flex items-center gap-2.5 rounded-full px-2 py-1 text-left" aria-label="Open focus timer">
        <span className="font-mono text-[15px] font-semibold tabular-nums">{formatClock(remainingMs)}</span>
        <span className="hidden max-w-[180px] truncate text-[12.5px] text-fg-muted sm:block">
          {state.phase === "break" ? "Break" : (state.task?.title ?? "Focus")}
        </span>
        <span className="relative h-1 w-10 overflow-hidden rounded-full bg-surface-3" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </span>
        <Maximize2 className="size-3.5 text-fg-subtle" />
      </button>
    </motion.div>
  );
}

function FocusOverlay({
  state,
  remainingMs,
  onMinimize,
  onPause,
  onAddFive,
  onStop,
  onDone,
  onLength,
}: {
  state: Running;
  remainingMs: number;
  onMinimize: () => void;
  onPause: () => void;
  onAddFive: () => void;
  onStop: () => void;
  onDone: () => void;
  onLength: (min: number) => void;
}) {
  const progress = Math.min(1, 1 - remainingMs / state.lengthMs);
  const R = 132;
  const C = 2 * Math.PI * R;
  const isBreak = state.phase === "break";
  const lengthMin = Math.round(state.lengthMs / 60000);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-bg/85 px-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={isBreak ? "Break" : "Focus session"}
    >
      <div className="app-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <Button variant="ghost" size="sm" className="absolute right-4 top-4" onClick={onMinimize}>
        <Minimize2 /> Minimize
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: ease.expo }}
        className="relative flex flex-col items-center text-center"
      >
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          {isBreak ? "Break" : "Focus"} · {lengthMin} min{state.status === "paused" ? " · Paused" : ""}
        </p>

        <div className="relative mt-6 size-[300px] max-w-[78vw] max-h-[78vw]">
          <svg viewBox="0 0 300 300" className="size-full -rotate-90" aria-hidden>
            <circle cx="150" cy="150" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
            <circle
              cx="150"
              cy="150"
              r={R}
              fill="none"
              stroke={isBreak ? "var(--success)" : "var(--accent)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-[clamp(3rem,13vw,4.5rem)] font-semibold tabular-nums tracking-[-0.04em]" role="timer" aria-live="off">
              {formatClock(remainingMs)}
            </p>
            {!isBreak && (
              <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Focus length">
                {FOCUS_LENGTHS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={lengthMin === m}
                    onClick={() => onLength(m)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-mono text-[11px] transition-colors",
                      lengthMin === m ? "bg-accent-soft text-accent" : "text-fg-subtle hover:text-fg",
                    )}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-6 max-w-[520px] text-balance text-[22px] font-semibold tracking-[-0.025em]">
          {isBreak ? "Stand up, stretch, get some water." : (state.task?.title ?? "Focus time")}
        </h2>
        {!isBreak && state.task?.planTitle && <p className="mt-1 text-[14px] text-fg-muted">{state.task.planTitle}</p>}

        <div className="mt-8 flex items-center gap-3">
          <Button variant="secondary" size="icon" className="size-11 rounded-full" onClick={onAddFive} aria-label="Add 5 minutes" title="Add 5 minutes">
            <Plus />
          </Button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onPause}
            aria-label={state.status === "paused" ? "Resume" : "Pause"}
            className={cn(
              "flex size-16 items-center justify-center rounded-full text-accent-fg shadow-lg transition-colors",
              isBreak ? "bg-success" : "bg-accent hover:bg-accent-hover",
            )}
          >
            {state.status === "paused" ? <Play className="size-6 fill-current" /> : <Pause className="size-6 fill-current" />}
          </motion.button>
          <Button variant="secondary" size="icon" className="size-11 rounded-full" onClick={onStop} aria-label={isBreak ? "Skip break" : "Stop"} title={isBreak ? "Skip break" : "Stop"}>
            <Square className="fill-current" />
          </Button>
        </div>

        {!isBreak && state.task && (
          <Button variant="ghost" className="mt-6" onClick={onDone}>
            <Check /> Mark task done
          </Button>
        )}
        <p className="mt-6 font-mono text-[11px] text-fg-subtle">Space to pause · Esc to minimize</p>
      </motion.div>
    </motion.div>
  );
}
