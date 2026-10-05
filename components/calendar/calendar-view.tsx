"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePlanStore } from "@/components/planner/plan-store";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Select } from "@/components/ui/field";
import { ease } from "@/lib/motion";
import {
  addDays,
  addMonths,
  formatClock,
  formatLong,
  formatMinutes,
  formatShort,
  formatWithWeekday,
  localToday,
  monthNames,
  parseDate,
  startOfMonth,
  startOfWeek,
  weekday,
  weekdayNames,
} from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import type { ScheduleItem, Task } from "@/types/plan";

type Mode = "day" | "week" | "month" | "agenda";
type Session = ScheduleItem & { task: Task };

export function CalendarView() {
  const { plan, dispatch, openTask } = usePlanStore();
  const today = localToday();
  const [mode, setMode] = useState<Mode>("week");
  const [cursor, setCursor] = useState(() => (today >= plan.startDate && today <= plan.endDate ? today : plan.startDate));

  // Agenda is the natural calendar on small screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adapt to viewport once mounted
    if (mq.matches) setMode("agenda");
  }, []);

  const sessions = useMemo(() => {
    const byTask = new Map(plan.tasks.map((t) => [t.id, t]));
    const map = new Map<string, Session[]>();
    for (const s of plan.schedule) {
      const task = byTask.get(s.taskId);
      if (!task) continue;
      map.set(s.date, [...(map.get(s.date) ?? []), { ...s, task }]);
    }
    return map;
  }, [plan.schedule, plan.tasks]);

  const dueByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of plan.tasks) map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    return map;
  }, [plan.tasks]);

  const step = (dir: 1 | -1) =>
    setCursor((c) => (mode === "month" ? addMonths(c, dir) : addDays(c, dir * (mode === "day" ? 1 : mode === "week" ? 7 : 14))));

  const title =
    mode === "month"
      ? `${monthNames.long[parseDate(cursor).getUTCMonth()]} ${parseDate(cursor).getUTCFullYear()}`
      : mode === "week"
        ? `${formatShort(startOfWeek(cursor))} – ${formatShort(addDays(startOfWeek(cursor), 6))}`
        : mode === "day"
          ? formatLong(cursor)
          : `From ${formatShort(cursor)}`;

  const { dailyMinutes, blockedWeekdays } = plan.constraints;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Calendar</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Work sessions are scheduled from each task’s effort, deadline and dependencies.
          </p>
        </div>
      </div>

      {/* Availability */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-fg-muted">Daily time</span>
          <Select
            aria-label="Daily time available"
            value={dailyMinutes}
            onChange={(e) => dispatch({ type: "plan.constraints", constraints: { dailyMinutes: Number(e.target.value) } })}
            className="w-28 [&_select]:h-8"
          >
            {[...new Set([15, 30, 45, 60, 90, 120, 180, 240, 360, 480, dailyMinutes])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)}
                </option>
              ))}
          </Select>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-fg-muted">Working days</span>
          <div className="flex gap-1" role="group" aria-label="Working days">
            {weekdayNames.short.map((name, d) => {
              const on = !blockedWeekdays.includes(d);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  aria-label={weekdayNames.long[d]}
                  onClick={() => {
                    const next = on ? [...blockedWeekdays, d] : blockedWeekdays.filter((x) => x !== d);
                    if (next.length >= 7) return;
                    dispatch({ type: "plan.constraints", constraints: { blockedWeekdays: next.sort() } });
                  }}
                  className={cn(
                    "size-8 rounded-lg text-xs font-medium transition-colors",
                    on ? "bg-accent-soft text-accent ring-1 ring-inset ring-accent-line" : "bg-surface-2 text-fg-subtle line-through hover:text-fg",
                  )}
                >
                  {name[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next" onClick={() => step(1)}>
            <ChevronRight />
          </Button>
          <Button variant="secondary" size="xs" className="ml-1" onClick={() => setCursor(today)}>
            Today
          </Button>
          <h2 className="ml-3 text-[15px] font-medium tabular-nums">{title}</h2>
        </div>
        <Segmented
          label="Calendar view"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "agenda", label: "Agenda" },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${mode}-${mode === "month" ? startOfMonth(cursor) : mode === "week" ? startOfWeek(cursor) : cursor}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: ease.out }}
        >
          {mode === "month" && (
            <MonthGrid cursor={cursor} today={today} sessions={sessions} dueByDate={dueByDate} blocked={blockedWeekdays} onOpen={openTask} onPickDay={(d) => { setCursor(d); setMode("day"); }} />
          )}
          {mode === "week" && (
            <WeekColumns cursor={cursor} today={today} sessions={sessions} blocked={blockedWeekdays} onOpen={openTask} />
          )}
          {mode === "day" && <DayList date={cursor} sessions={sessions.get(cursor) ?? []} due={dueByDate.get(cursor) ?? []} onOpen={openTask} />}
          {mode === "agenda" && <Agenda from={cursor} today={today} sessions={sessions} onOpen={openTask} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SessionChip({ s, onOpen, showTime }: { s: Session; onOpen: (id: string) => void; showTime?: boolean }) {
  const done = s.task.status === "done";
  return (
    <button
      type="button"
      onClick={() => onOpen(s.taskId)}
      className={cn(
        "w-full truncate rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-snug transition-colors hover:bg-surface-3",
        s.task.priority === "high" ? "border-accent" : "border-fg-subtle/60",
        done ? "text-fg-subtle line-through" : "bg-surface-2 text-fg",
      )}
      title={`${s.task.title} · ${formatClock(s.startMinute)} · ${formatMinutes(s.durationMinutes)}`}
    >
      {showTime && <span className="mr-1 tabular-nums text-fg-subtle">{formatClock(s.startMinute).replace(":00", "")}</span>}
      {s.task.title}
    </button>
  );
}

function MonthGrid({
  cursor,
  today,
  sessions,
  dueByDate,
  blocked,
  onOpen,
  onPickDay,
}: {
  cursor: string;
  today: string;
  sessions: Map<string, Session[]>;
  dueByDate: Map<string, Task[]>;
  blocked: number[];
  onOpen: (id: string) => void;
  onPickDay: (d: string) => void;
}) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const month = first.slice(0, 7);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface scrollbar-thin">
      <div className="min-w-[640px]">
      <div className="grid grid-cols-7 border-b border-border">
        {weekdayNames.short.map((d) => (
          <div key={d} className="px-2 py-2 text-[11px] font-medium text-fg-subtle">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const items = sessions.get(d) ?? [];
          const milestonesDue = (dueByDate.get(d) ?? []).length;
          const inMonth = d.startsWith(month);
          return (
            <div
              key={d}
              className={cn(
                "min-h-[104px] border-border p-1.5",
                i % 7 !== 6 && "border-r",
                i < 35 && "border-b",
                !inMonth && "bg-surface-2/40",
                blocked.includes(weekday(d)) && inMonth && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,var(--surface-2)_6px,var(--surface-2)_7px)]",
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(d)}
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors hover:bg-surface-3",
                  d === today ? "bg-accent font-semibold text-accent-fg hover:bg-accent" : inMonth ? "text-fg" : "text-fg-subtle",
                )}
                aria-label={`${formatLong(d)}: ${items.length} sessions${milestonesDue ? `, ${milestonesDue} due` : ""}`}
              >
                {parseDate(d).getUTCDate()}
              </button>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((s) => (
                  <SessionChip key={s.id} s={s} onOpen={onOpen} />
                ))}
                {items.length > 3 && (
                  <button type="button" onClick={() => onPickDay(d)} className="px-1.5 text-left text-[11px] text-fg-subtle hover:text-fg">
                    +{items.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function WeekColumns({
  cursor,
  today,
  sessions,
  blocked,
  onOpen,
}: {
  cursor: string;
  today: string;
  sessions: Map<string, Session[]>;
  blocked: number[];
  onOpen: (id: string) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface scrollbar-thin">
    <div className="grid min-w-[680px] grid-cols-7">
      {days.map((d, i) => {
        const items = sessions.get(d) ?? [];
        const total = items.reduce((a, s) => a + s.durationMinutes, 0);
        const off = blocked.includes(weekday(d));
        return (
          <div key={d} className={cn("flex min-h-[320px] min-w-0 flex-col", i < 6 && "border-r border-border", off && "bg-surface-2/50")}>
            <div className="border-b border-border px-2.5 py-2">
              <p className="text-[11px] font-medium text-fg-subtle">{weekdayNames.short[weekday(d)]}</p>
              <p className={cn("text-[15px] font-medium tabular-nums", d === today ? "text-accent" : "text-fg")}>
                {parseDate(d).getUTCDate()}
              </p>
              <p className="text-[10.5px] tabular-nums text-fg-subtle">{off ? "Off" : total ? formatMinutes(total) : "—"}</p>
            </div>
            <div className="flex flex-col gap-1.5 p-1.5">
              {items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpen(s.taskId)}
                  className={cn(
                    "rounded-lg border border-border px-2 py-1.5 text-left transition-colors hover:border-border-strong",
                    s.task.status === "done" ? "bg-surface-2 opacity-60" : "bg-surface",
                  )}
                >
                  <p className="text-[10.5px] tabular-nums text-fg-subtle">
                    {formatClock(s.startMinute)} · {formatMinutes(s.durationMinutes)}
                  </p>
                  <p className="line-clamp-3 text-[12px] leading-snug text-fg">{s.task.title}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

function DayList({ date, sessions, due, onOpen }: { date: string; sessions: Session[]; due: Task[]; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-2">
      {sessions.length === 0 && due.length === 0 ? (
        <p className="px-3 py-10 text-center text-sm text-fg-muted">Nothing scheduled for {formatWithWeekday(date)}.</p>
      ) : (
        <ul className="flex flex-col">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onOpen(s.taskId)}
                className="flex w-full items-start gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
              >
                <span className="w-20 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">
                  {formatClock(s.startMinute)}
                  <br />
                  {formatMinutes(s.durationMinutes)}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[14px]", s.task.status === "done" && "text-fg-subtle line-through")}>{s.task.title}</span>
                  {s.task.description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-fg-muted">{s.task.description}</span>}
                </span>
              </button>
            </li>
          ))}
          {due.length > 0 && (
            <li className="mt-2 border-t border-border px-3 pb-2 pt-3">
              <p className="text-xs font-medium text-fg-subtle">Due today</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {due.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => onOpen(t.id)} className="text-left text-[13px] text-fg hover:underline">
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Agenda({ from, today, sessions, onOpen }: { from: string; today: string; sessions: Map<string, Session[]>; onOpen: (id: string) => void }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i)).filter((d) => (sessions.get(d) ?? []).length);
  if (!days.length) {
    return <p className="rounded-2xl border border-border bg-surface px-3 py-10 text-center text-sm text-fg-muted">Nothing scheduled in the next two weeks.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {days.map((d) => (
        <section key={d}>
          <h3 className={cn("mb-1.5 text-[13px] font-medium", d === today ? "text-accent" : "text-fg-muted")}>
            {d === today ? "Today · " : ""}
            {formatWithWeekday(d)}
          </h3>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {(sessions.get(d) ?? []).map((s, i) => (
              <li key={s.id} className={cn(i > 0 && "border-t border-border")}>
                <button type="button" onClick={() => onOpen(s.taskId)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2">
                  <span className="w-16 shrink-0 text-xs tabular-nums text-fg-subtle">{formatClock(s.startMinute)}</span>
                  <span className={cn("min-w-0 flex-1 truncate text-[14px]", s.task.status === "done" && "text-fg-subtle line-through")}>{s.task.title}</span>
                  <span className="text-xs tabular-nums text-fg-subtle">{formatMinutes(s.durationMinutes)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
