"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Bell, CalendarDays, Play, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FOCUS_SAVED_EVENT, TASK_DONE_EVENT, useFocus, type FocusTask } from "@/components/focus/focus";
import { PRIORITY_DOT } from "@/components/generation/plan-graph";
import { Button } from "@/components/ui/button";
import { TaskCheck } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { Agenda, AgendaSession, AgendaTask } from "@/lib/db/today";
import { ease } from "@/lib/motion";
import { addDays, formatMinutes, formatWithWeekday, localToday, monthNames, parseDate, weekdayNames } from "@/lib/planning/dates";
import { formatRange, greeting, minuteOfDay } from "@/lib/planning/reminders";
import { cn } from "@/lib/utils/cn";

export type TodayData = Agenda & { reminders: boolean; dailyMinutes: number };

/** Start of the local day as an instant, for "focused today" totals. */
function startOfLocalDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchToday(): Promise<TodayData | null> {
  const res = await fetch(`/api/today?date=${localToday()}&since=${encodeURIComponent(startOfLocalDay())}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as TodayData;
}

async function setTaskStatus(planId: string, taskId: string, status: "done" | "todo") {
  const res = await fetch(`/api/plans/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ type: "task.update", taskId, patch: { status } }] }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.04 * i, ease: ease.expo },
});

export function TodayView({ firstName }: { firstName: string }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const focus = useFocus();
  const toast = useToast();

  const load = useCallback(async () => {
    const next = await fetchToday();
    if (next) setData(next);
    else setFailed(true);
  }, []);

  useEffect(() => {
    // Data and the clock are browser-only (local date and time), so both start after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
    const tick = () => setNow(new Date());
    tick();
    const t = window.setInterval(tick, 30_000);
    const onDone = () => void load();
    // Refresh when the focus timer finishes a task or saves focused minutes.
    window.addEventListener(TASK_DONE_EVENT, onDone);
    window.addEventListener(FOCUS_SAVED_EVENT, onDone);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(TASK_DONE_EVENT, onDone);
      window.removeEventListener(FOCUS_SAVED_EVENT, onDone);
    };
  }, [load]);

  const toggleDone = useCallback(
    async (planId: string, taskId: string, title: string, done: boolean) => {
      const status = done ? "todo" : "done";
      // Optimistic: flip every row for this task, roll back on failure.
      const flip = (s: "done" | "todo") =>
        setData((d) =>
          d && {
            ...d,
            sessions: d.sessions.map((x) => (x.taskId === taskId ? { ...x, taskStatus: s } : x)),
            overdue: s === "done" ? d.overdue.filter((x) => x.taskId !== taskId) : d.overdue,
            dueToday: s === "done" ? d.dueToday.filter((x) => x.taskId !== taskId) : d.dueToday,
          },
        );
      flip(status);
      const ok = await setTaskStatus(planId, taskId, status);
      if (!ok) {
        flip(status === "done" ? "todo" : "done");
        toast({ message: "Couldn’t update that task.", tone: "error" });
        return;
      }
      if (status === "done") {
        toast({
          message: `Done: ${title}. Your schedule moved up.`,
          action: {
            label: "Undo",
            onClick: () => void setTaskStatus(planId, taskId, "todo").then(() => load()),
          },
        });
      } else void load();
    },
    [load, toast],
  );

  if (failed && !data) {
    return (
      <main id="main" className="mx-auto max-w-[520px] px-4 pt-28 text-center">
        <p className="text-[15px] text-fg-muted">Couldn’t load your day.</p>
        <Button variant="secondary" className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </main>
    );
  }

  if (!data || !now) {
    return (
      <main id="main" className="flex justify-center pt-32" aria-busy="true">
        <Spinner className="size-5 text-fg-subtle" />
      </main>
    );
  }

  const today = data.date;
  const nowMinute = minuteOfDay(now);
  const todays = data.sessions.filter((s) => s.date === today);
  const later = data.sessions.filter((s) => s.date !== today);
  const plannedMinutes = todays.filter((s) => s.taskStatus !== "done").reduce((sum, s) => sum + s.durationMinutes, 0);
  const doneCount = todays.filter((s) => s.taskStatus === "done").length;
  const d = parseDate(today);
  const dateLabel = `${weekdayNames.long[d.getUTCDay()]}, ${monthNames.long[d.getUTCMonth()]} ${d.getUTCDate()}`;

  const startFocus = (task: FocusTask | null, minutes?: number) => focus.start(task, minutes);

  if (data.activePlans === 0) {
    return (
      <main id="main" className="mx-auto flex max-w-[520px] flex-col items-center px-4 pt-28 text-center">
        <span className="text-[56px]" aria-hidden>
          🌤️
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">Nothing planned yet</h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          Make a plan and its work sessions will show up here each day, with reminders before they start.
        </p>
        <Button asChild variant="primary" className="mt-7 rounded-full px-5">
          <Link href="/app">Make a plan</Link>
        </Button>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <motion.header {...rise(0)}>
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-fg-subtle">{dateLabel}</p>
        <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.035em]">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-2 text-[15.5px] text-fg-muted">
          {todays.length - doneCount === 0
            ? data.focus.todayMinutes > 0 || doneCount > 0
              ? "You’re clear for today. Nice work."
              : "No sessions today. A good day to get ahead or rest."
            : `${todays.length - doneCount} session${todays.length - doneCount === 1 ? "" : "s"} left, ${formatMinutes(plannedMinutes)} planned.`}
        </p>
      </motion.header>

      <motion.dl {...rise(1)} className="mt-7 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-surface">
        <Stat label="Left" value={String(todays.length - doneCount)} hint={todays.length - doneCount === 1 ? "session" : "sessions"} />
        <Stat label="Planned" value={formatMinutes(plannedMinutes)} />
        <Stat label="Focused" value={formatMinutes(data.focus.todayMinutes)} hint={`${formatMinutes(data.focus.weekMinutes)} this week`} />
      </motion.dl>

      {data.reminders && <ReminderBanner />}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="sessions-h">
            <SectionTitle id="sessions-h" icon={CalendarDays}>
              Today’s sessions
            </SectionTitle>
            {todays.length === 0 ? (
              <EmptyDay next={later[0]} today={today} />
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {todays.map((s, i) => (
                  <motion.li key={s.id} {...rise(i + 2)}>
                    <SessionCard
                      session={s}
                      state={s.taskStatus === "done" ? "done" : nowMinute >= s.startMinute + s.durationMinutes ? "past" : nowMinute >= s.startMinute ? "now" : "upcoming"}
                      focusing={focus.state.status !== "idle" && focus.state.task?.taskId === s.taskId}
                      onFocus={() =>
                        startFocus({ planId: s.planId, taskId: s.taskId, title: s.taskTitle, planTitle: s.planTitle }, Math.min(50, Math.max(15, s.durationMinutes)))
                      }
                      onToggle={() => void toggleDone(s.planId, s.taskId, s.taskTitle, s.taskStatus === "done")}
                    />
                  </motion.li>
                ))}
              </ol>
            )}
          </section>

          {(data.overdue.length > 0 || data.dueToday.length > 0) && (
            <section aria-labelledby="due-h">
              <SectionTitle id="due-h" icon={AlertCircle}>
                Deadlines
              </SectionTitle>
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                <AnimatePresence initial={false}>
                  {[...data.overdue.map((t) => ({ t, overdue: true })), ...data.dueToday.map((t) => ({ t, overdue: false }))].map(({ t, overdue }) => (
                    <DueRow
                      key={t.taskId}
                      task={t}
                      overdue={overdue}
                      today={today}
                      onFocus={() => startFocus({ planId: t.planId, taskId: t.taskId, title: t.taskTitle, planTitle: t.planTitle })}
                      onDone={() => void toggleDone(t.planId, t.taskId, t.taskTitle, false)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <motion.section {...rise(3)} aria-labelledby="focus-h" className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Timer className="size-4" />
              </span>
              <h2 id="focus-h" className="text-[15px] font-semibold tracking-[-0.01em]">
                Focus
              </h2>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
              A timer with a short break after each block. Start one from any session, or on its own.
            </p>
            <div className="mt-4 flex gap-2">
              {[15, 25, 50].map((m) => (
                <Button key={m} variant={m === 25 ? "primary" : "secondary"} size="sm" className="flex-1" onClick={() => startFocus(null, m)}>
                  {m} min
                </Button>
              ))}
            </div>
          </motion.section>

          <motion.section {...rise(4)} aria-labelledby="week-h">
            <SectionTitle id="week-h" icon={CalendarDays}>
              Next few days
            </SectionTitle>
            <NextDays sessions={later} today={today} />
          </motion.section>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-r border-border px-4 py-4 last:border-r-0 sm:px-5">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">{label}</dt>
      <dd className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.03em]">{value}</dd>
      {hint && <dd className="hidden text-[12px] text-fg-subtle sm:block">{hint}</dd>}
    </div>
  );
}

function SectionTitle({ id, icon: Icon, children }: { id: string; icon: typeof Timer; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-[13px] font-semibold text-fg-muted">
      <Icon className="size-4 text-fg-subtle" aria-hidden />
      {children}
    </h2>
  );
}

function SessionCard({
  session: s,
  state,
  focusing,
  onFocus,
  onToggle,
}: {
  session: AgendaSession;
  state: "upcoming" | "now" | "past" | "done";
  focusing: boolean;
  onFocus: () => void;
  onToggle: () => void;
}) {
  const done = state === "done";
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border bg-surface px-4 py-3.5 transition-colors sm:px-5",
        state === "now" ? "border-accent-line shadow-[0_0_0_4px_var(--accent-soft)]" : "border-border",
        done && "bg-surface/60",
      )}
    >
      <TaskCheck checked={done} onChange={onToggle} label={done ? `Mark “${s.taskTitle}” not done` : `Mark “${s.taskTitle}” done`} />
      <div className="w-[118px] shrink-0 max-sm:hidden">
        <p className={cn("font-mono text-[12px] tabular-nums", state === "now" ? "text-accent" : "text-fg-subtle")}>{formatRange(s.startMinute, s.durationMinutes)}</p>
        {state === "now" && <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Now</p>}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-medium", done && "text-fg-subtle line-through decoration-fg-subtle/60")}>{s.taskTitle}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-fg-subtle">
          <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[s.priority])} aria-label={`${s.priority} priority`} />
          <span className="font-mono tabular-nums sm:hidden">{formatRange(s.startMinute, s.durationMinutes)} ·</span>
          <Link href={`/plan/${s.planId}`} className="truncate hover:text-fg">
            {s.planTitle}
            {s.phaseTitle ? ` · ${s.phaseTitle}` : ""}
          </Link>
        </p>
      </div>
      {!done && (
        <Button
          variant={state === "now" ? "primary" : "secondary"}
          size="sm"
          className="shrink-0 rounded-full"
          onClick={onFocus}
          disabled={focusing}
          aria-label={focusing ? `Focusing on ${s.taskTitle}` : `Start focus on ${s.taskTitle}`}
        >
          <Play className="fill-current" />
          <span className="max-sm:hidden">{focusing ? "Focusing" : "Focus"}</span>
        </Button>
      )}
    </div>
  );
}

function DueRow({ task: t, overdue, today, onFocus, onDone }: { task: AgendaTask; overdue: boolean; today: string; onFocus: () => void; onDone: () => void }) {
  const days = Math.round((parseDate(today).getTime() - parseDate(t.dueDate).getTime()) / 86_400_000);
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-4 py-3 sm:px-5"
    >
      <TaskCheck checked={false} onChange={onDone} label={`Mark “${t.taskTitle}” done`} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium">{t.taskTitle}</p>
        <p className="truncate text-[12.5px] text-fg-subtle">{t.planTitle}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px]",
          overdue ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
        )}
      >
        {overdue ? (days === 1 ? "1 day late" : `${days} days late`) : "Due today"}
      </span>
      <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onFocus} aria-label={`Start focus on ${t.taskTitle}`}>
        <Play className="fill-current" />
      </Button>
    </motion.li>
  );
}

function EmptyDay({ next, today }: { next: AgendaSession | undefined; today: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center">
      <p className="text-[15px] font-medium">Nothing scheduled today</p>
      <p className="mt-1 text-[13.5px] text-fg-muted">
        {next
          ? `Next up: ${next.taskTitle}, ${next.date === addDays(today, 1) ? "tomorrow" : formatWithWeekday(next.date)} at ${formatRange(next.startMinute, next.durationMinutes).split(" – ")[0]}.`
          : "Your plans have no sessions this week."}
      </p>
    </div>
  );
}

function NextDays({ sessions, today }: { sessions: AgendaSession[]; today: string }) {
  const days = useMemo(() => {
    const out: { date: string; items: AgendaSession[] }[] = [];
    for (let i = 1; i <= 6; i++) {
      const date = addDays(today, i);
      out.push({ date, items: sessions.filter((s) => s.date === date) });
    }
    return out;
  }, [sessions, today]);

  return (
    <ul className="mt-3 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {days.map(({ date, items }) => {
        const minutes = items.reduce((sum, s) => sum + s.durationMinutes, 0);
        return (
          <li key={date} className="border-b border-border px-4 py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13.5px] font-medium">{date === addDays(today, 1) ? "Tomorrow" : formatWithWeekday(date)}</p>
              <p className="font-mono text-[11.5px] tabular-nums text-fg-subtle">{items.length ? formatMinutes(minutes) : "Free"}</p>
            </div>
            {items.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-1">
                {items.slice(0, 3).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                    <span className={cn("size-1.5 shrink-0 rounded-full", s.taskStatus === "done" ? "bg-success" : "bg-accent")} aria-hidden />
                    <span className="truncate">{s.taskTitle}</span>
                  </li>
                ))}
                {items.length > 3 && <li className="pl-3.5 text-[12px] text-fg-subtle">+{items.length - 3} more</li>}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Asks for notification permission so reminders reach you in other tabs. */
function ReminderBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser-only API after mount
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);
  if (permission !== "default") return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent-line bg-accent-soft px-4 py-3"
    >
      <Bell className="size-4 shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1 text-[13.5px]">Get a heads-up five minutes before each session, even in another tab.</p>
      <Button
        size="sm"
        variant="primary"
        className="rounded-full"
        onClick={() => void Notification.requestPermission().then(setPermission)}
      >
        Turn on <ArrowRight />
      </Button>
    </motion.div>
  );
}
