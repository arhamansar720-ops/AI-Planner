"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Insights } from "@/lib/db/insights";
import { ease } from "@/lib/motion";
import { addDays, formatMinutes, formatShort, formatWithWeekday, localToday, monthNames, parseDate } from "@/lib/planning/dates";
import { currentStreak, fillDays, intensity, longestStreak, weekColumns, type DayValue } from "@/lib/planning/insights";
import { cn } from "@/lib/utils/cn";

type Data = Insights & { dailyMinutes: number };

const WEEKS = 52;

const rise = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.05 * i, ease: ease.expo },
});

/** Heatmap fills: one hue (the theme accent), light to dark. */
const HEAT = [
  "var(--surface-3)",
  "color-mix(in oklab, var(--accent) 28%, var(--surface))",
  "color-mix(in oklab, var(--accent) 50%, var(--surface))",
  "color-mix(in oklab, var(--accent) 74%, var(--surface))",
  "var(--accent)",
];

export function InsightsView() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch(`/api/insights?date=${localToday()}&tz=${encodeURIComponent(tz)}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setData((await res.json()) as Data);
    else setFailed(true);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch (uses the browser's date and zone)
    void load();
  }, []);

  if (failed && !data) {
    return (
      <main id="main" className="mx-auto max-w-[520px] px-4 pt-28 text-center">
        <p className="text-[15px] text-fg-muted">Couldn’t load your insights.</p>
        <Button variant="secondary" className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </main>
    );
  }
  if (!data) {
    return (
      <main id="main" className="flex justify-center pt-32" aria-busy="true">
        <Spinner className="size-5 text-fg-subtle" />
      </main>
    );
  }
  return <Dashboard data={data} />;
}

function Dashboard({ data }: { data: Data }) {
  const { today } = data;
  const from = addDays(today, -(WEEKS * 7 - 1));
  const focusDays = useMemo(() => fillDays(data.focusByDay, from, today), [data.focusByDay, from, today]);
  const doneMap = useMemo(() => new Map(data.doneByDay.map((d) => [d.date, d.value])), [data.doneByDay]);
  const active = useMemo(
    () => [...data.focusByDay.filter((d) => d.value > 0).map((d) => d.date), ...data.doneByDay.filter((d) => d.value > 0).map((d) => d.date)],
    [data.focusByDay, data.doneByDay],
  );
  const streak = currentStreak(active, today);
  const best = longestStreak(active);
  const last30 = addDays(today, -29);
  const focus30 = data.focusByDay.filter((d) => d.date >= last30).reduce((s, d) => s + d.value, 0);
  const done30 = data.doneByDay.filter((d) => d.date >= last30).reduce((s, d) => s + d.value, 0);
  const onTimePct = data.onTime.done ? Math.round((data.onTime.onTime / data.onTime.done) * 100) : null;
  const nothingYet = active.length === 0 && data.plans.length === 0;

  return (
    <main id="main" className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <motion.header {...rise(0)}>
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Insights</p>
        <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.035em]">Your progress</h1>
        <p className="mt-2 max-w-[560px] text-[15.5px] text-fg-muted">
          {nothingYet
            ? "Finish tasks and run focus sessions, and your progress shows up here."
            : streak > 1
              ? `${streak} days in a row. Keep it going.`
              : "How your focus, finished work and the weeks ahead are shaping up."}
        </p>
      </motion.header>

      <motion.dl {...rise(1)} className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} hint={`Best: ${best} ${best === 1 ? "day" : "days"}`} accent={streak > 0} />
        <Stat icon={Clock} label="Focused" value={formatMinutes(focus30)} hint="Last 30 days" />
        <Stat icon={CheckCircle2} label="Finished" value={String(done30)} hint={done30 === 1 ? "task, last 30 days" : "tasks, last 30 days"} />
        <Stat icon={Target} label="On time" value={onTimePct === null ? "–" : `${onTimePct}%`} hint={onTimePct === null ? "No finished tasks yet" : "Done by the due date"} />
      </motion.dl>

      <motion.section {...rise(2)} aria-labelledby="heat-h" className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="heat-h" className="text-[15px] font-semibold tracking-[-0.01em]">
            Focus, last 12 months
          </h2>
          <p className="text-[12.5px] text-fg-subtle">{formatMinutes(focusDays.reduce((s, d) => s + d.value, 0))} in total</p>
        </div>
        <Heatmap days={focusDays} done={doneMap} today={today} />
      </motion.section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <motion.section {...rise(3)} aria-labelledby="weeks-h" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="weeks-h" className="text-[15px] font-semibold tracking-[-0.01em]">
            Tasks finished per week
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-subtle">Last 12 weeks</p>
          <WeeklyBars done={data.doneByDay} today={today} />
        </motion.section>

        <motion.section {...rise(4)} aria-labelledby="load-h" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="load-h" className="text-[15px] font-semibold tracking-[-0.01em]">
            The next two weeks
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-subtle">Scheduled work per day, against your daily time of {formatMinutes(data.dailyMinutes)}</p>
          <LoadBars load={data.load} today={today} daily={data.dailyMinutes} />
        </motion.section>
      </div>

      <motion.section {...rise(5)} aria-labelledby="plans-h" className="mt-6">
        <h2 id="plans-h" className="text-[13px] font-semibold text-fg-muted">
          Active plans
        </h2>
        {data.plans.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center">
            <p className="text-[14.5px] text-fg-muted">No active plans.</p>
            <Button asChild variant="primary" size="sm" className="mt-4 rounded-full px-4">
              <Link href="/app">Make a plan</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.plans.map((p) => (
              <PlanRow key={p.id} plan={p} today={today} />
            ))}
          </ul>
        )}
      </motion.section>
    </main>
  );
}

function Stat({ icon: Icon, label, value, hint, accent }: { icon: typeof Flame; label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5">
      <dt className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
        <Icon className={cn("size-3.5", accent ? "text-accent" : "text-fg-subtle")} aria-hidden />
        {label}
      </dt>
      <dd className="mt-1.5 text-[24px] font-semibold tabular-nums tracking-[-0.03em]">{value}</dd>
      <dd className="text-[12px] text-fg-subtle">{hint}</dd>
    </div>
  );
}

/* Tooltip ---------------------------------------------------------------- */

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

function useTip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const show = (el: Element, title: string, lines: string[]) => {
    const box = ref.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    // Keep the tooltip inside the card near its edges.
    const x = Math.min(Math.max(r.left - box.left + r.width / 2, 72), box.width - 72);
    setTip({ x, y: r.top - box.top, title, lines });
  };
  return { ref, tip, show, hide: () => setTip(null) };
}

function TipBox({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] shadow-md"
      style={{ left: tip.x, top: tip.y }}
      role="status"
    >
      <p className="font-medium text-fg">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="text-fg-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

/* Heatmap ---------------------------------------------------------------- */

function Heatmap({ days, done, today }: { days: DayValue[]; done: Map<string, number>; today: string }) {
  const { ref, tip, show, hide } = useTip();
  const scroller = useRef<HTMLDivElement>(null);
  const max = Math.max(0, ...days.map((d) => d.value));
  const cols = weekColumns(days);
  // A month label sits over the first week that starts in that month.
  const monthLabels = cols.map((col, i) => {
    const month = (c: (DayValue | null)[]) => {
      const first = c.find(Boolean);
      return first ? parseDate(first.date).getUTCMonth() : -1;
    };
    const m = month(col);
    return i > 0 && m !== month(cols[i - 1]) ? monthNames.short[m] : "";
  });

  // On narrow screens the grid scrolls sideways; start at the most recent weeks.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const grid = { gridTemplateColumns: `repeat(${cols.length}, minmax(11px, 1fr))` };
  return (
    <div ref={ref} className="relative mt-4" onMouseLeave={hide}>
      <div className="flex gap-2">
        <div className="flex w-7 shrink-0 flex-col pt-[18px] text-[10.5px] text-fg-subtle" aria-hidden>
          <div className="grid flex-1 grid-rows-7 gap-[3px]">
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <span key={i} className="flex items-center">
                {d}
              </span>
            ))}
          </div>
        </div>
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto pb-1 scrollbar-thin">
          <div className="grid gap-[3px]" style={grid} aria-hidden>
            {monthLabels.map((m, i) => (
              <span key={i} className="h-[15px] overflow-visible whitespace-nowrap text-[10.5px] leading-none text-fg-subtle">
                {m}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col gap-[3px]" style={{ ...grid, gridTemplateRows: "repeat(7, auto)" }}>
            {cols.flatMap((col, ci) =>
              col.map((cell, ri) => {
                if (!cell) return <span key={`${ci}-${ri}`} className="aspect-square" />;
                const level = intensity(cell.value, max);
                const tasks = done.get(cell.date) ?? 0;
                return (
                  <motion.span
                    key={`${ci}-${ri}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: ci * 0.008 }}
                    onMouseEnter={(e) =>
                      show(e.currentTarget, formatWithWeekday(cell.date), [
                        cell.value ? `${formatMinutes(cell.value)} focused` : "No focus time",
                        ...(tasks ? [`${tasks} ${tasks === 1 ? "task" : "tasks"} finished`] : []),
                      ])
                    }
                    className={cn("aspect-square rounded-[3px]", cell.date === today && "ring-1 ring-fg-subtle ring-offset-1 ring-offset-surface")}
                    style={{ background: HEAT[level] }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-fg-subtle" aria-hidden>
        Less
        {HEAT.map((c) => (
          <span key={c} className="size-[11px] rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
      <TipBox tip={tip} />
      <table className="sr-only">
        <caption>Focus minutes per day</caption>
        <tbody>
          {days
            .filter((d) => d.value > 0)
            .map((d) => (
              <tr key={d.date}>
                <th scope="row">{formatWithWeekday(d.date)}</th>
                <td>{formatMinutes(d.value)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* Bars ------------------------------------------------------------------- */

type Bar = { key: string; label: string; value: number; tip: string[]; title: string; over?: boolean; highlight?: boolean };

function Bars({ bars, unit, reference, caption }: { bars: Bar[]; unit: (v: number) => string; reference?: { value: number; label: string }; caption: string }) {
  const { ref, tip, show, hide } = useTip();
  const max = Math.max(1, reference?.value ?? 0, ...bars.map((b) => b.value)) * 1.12;
  const H = 150;
  return (
    <div ref={ref} className="relative mt-5" onMouseLeave={hide}>
      <div className="relative" style={{ height: H }}>
        {/* Recessive grid: baseline and the reference line only. */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
        {reference && reference.value > 0 && (
          <div className="absolute inset-x-0 border-t border-dashed border-fg-subtle/60" style={{ bottom: (reference.value / max) * H }} aria-hidden>
            <span className="absolute -top-[18px] right-0 bg-surface pl-1 text-[10.5px] text-fg-subtle">{reference.label}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {bars.map((b, i) => (
            <div
              key={b.key}
              className="group flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={(e) => show(e.currentTarget.firstElementChild ?? e.currentTarget, b.title, b.tip)}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: b.value ? Math.max(3, (b.value / max) * H) : 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.03, ease: ease.expo }}
                className={cn(
                  "relative w-full max-w-[28px] rounded-t-[4px] transition-opacity group-hover:opacity-80",
                  b.over ? "bg-warning" : "bg-accent",
                  !b.highlight && !b.over && "opacity-75",
                )}
              >
                {b.highlight && b.value > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-medium tabular-nums text-fg">{unit(b.value)}</span>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px]" aria-hidden>
        {bars.map((b) => (
          <span key={b.key} className="flex-1 whitespace-nowrap text-center text-[10.5px] text-fg-subtle">
            {b.label}
          </span>
        ))}
      </div>
      <TipBox tip={tip} />
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.title}</th>
              <td>{unit(b.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeeklyBars({ done, today }: { done: DayValue[]; today: string }) {
  const bars = useMemo(() => {
    const monday = addDays(today, -((parseDate(today).getUTCDay() + 6) % 7));
    return Array.from({ length: 12 }, (_, i) => {
      const start = addDays(monday, -(11 - i) * 7);
      const end = addDays(start, 6);
      const value = done.filter((d) => d.date >= start && d.date <= end).reduce((s, d) => s + d.value, 0);
      return {
        key: start,
        label: i % 3 === 2 ? formatShort(start) : "",
        value,
        title: `Week of ${formatShort(start)}`,
        tip: [`${value} ${value === 1 ? "task" : "tasks"} finished`],
        highlight: i === 11,
      };
    });
  }, [done, today]);
  if (bars.every((b) => b.value === 0)) return <Empty text="Tick off tasks in a plan or on Today, and your weekly count builds up here." />;
  return <Bars bars={bars} unit={(v) => String(v)} caption="Tasks finished per week" />;
}

function LoadBars({ load, today, daily }: { load: DayValue[]; today: string; daily: number }) {
  const bars = useMemo(
    () =>
      fillDays(load, today, addDays(today, 13)).map((d, i) => ({
        key: d.date,
        label: i === 0 ? "Today" : i % 4 === 0 ? formatShort(d.date) : "",
        value: d.value,
        title: formatWithWeekday(d.date),
        tip: [d.value ? `${formatMinutes(d.value)} scheduled` : "Free", ...(d.value > daily ? ["Over your daily time"] : [])],
        over: daily > 0 && d.value > daily,
        highlight: i === 0,
      })),
    [load, today, daily],
  );
  if (bars.every((b) => b.value === 0)) return <Empty text="No work scheduled in the next two weeks." />;
  const overDays = bars.filter((b) => b.over).length;
  return (
    <>
      <Bars bars={bars} unit={formatMinutes} reference={{ value: daily, label: "Daily time" }} caption="Scheduled minutes per day, next 14 days" />
      {overDays > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-fg-muted">
          <span className="size-2.5 rounded-[3px] bg-warning" aria-hidden />
          {overDays} {overDays === 1 ? "day is" : "days are"} over your daily time. Ask a plan’s assistant to spread the work out.
        </p>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-5 flex h-[150px] items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-[13.5px] text-fg-subtle">{text}</p>;
}

/* Plans ------------------------------------------------------------------ */

function PlanRow({ plan, today }: { plan: Insights["plans"][number]; today: string }) {
  const pct = plan.total ? Math.round((plan.done / plan.total) * 100) : 0;
  const daysLeft = Math.round((parseDate(plan.endDate).getTime() - parseDate(today).getTime()) / 86_400_000);
  return (
    <li>
      <Link
        href={`/plan/${plan.id}`}
        className="group block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[14.5px] font-medium group-hover:text-accent">{plan.title}</p>
          <p className="shrink-0 font-mono text-[12px] tabular-nums text-fg-subtle">{pct}%</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${plan.title} progress`}>
          <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: ease.expo }} />
        </div>
        <p className="mt-2 text-[12.5px] text-fg-subtle">
          {plan.done} of {plan.total} tasks ·{" "}
          {daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? "ends tomorrow" : daysLeft === 0 ? "ends today" : `ended ${formatShort(plan.endDate)}`}
        </p>
      </Link>
    </li>
  );
}
