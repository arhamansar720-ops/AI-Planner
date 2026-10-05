"use client";

import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { usePlanStore } from "@/components/planner/plan-store";
import { Input, Label } from "@/components/ui/field";
import { spring } from "@/lib/motion";
import { addDays, diffDays, formatShort, formatSpan, localToday, monthNames, parseDate } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/types/plan";

const ROW = 36;
const HEADER = 44;

export function TimelineView() {
  const { plan, dispatch, openTask } = usePlanStore();
  const today = localToday();
  const start = addDays(plan.startDate, -1);
  const end = addDays(plan.endDate, 5);
  const span = diffDays(end, start) + 1;
  const dayW = span <= 35 ? 30 : span <= 100 ? 16 : span <= 200 ? 8 : 5;
  const width = span * dayW;
  const x = (d: string) => diffDays(d, start) * dayW;

  // Rows: milestone lane, then each phase followed by its tasks.
  const rows = useMemo(() => {
    const out: ({ kind: "phase"; id: string; index: number } | { kind: "task"; task: Task })[] = [];
    plan.phases.forEach((p, index) => {
      out.push({ kind: "phase", id: p.id, index });
      for (const t of plan.tasks.filter((t) => t.phaseId === p.id)) out.push({ kind: "task", task: t });
    });
    return out;
  }, [plan.phases, plan.tasks]);

  const rowIndex = new Map<string, number>();
  rows.forEach((r, i) => r.kind === "task" && rowIndex.set(r.task.id, i));
  const height = (rows.length + 1) * ROW;

  // Columns follow the plan's own weeks: Week 1 starts on the start date.
  const weeks: string[] = [];
  for (let d = plan.startDate; d <= end; d = addDays(d, 7)) weeks.push(d);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Timeline</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Drag a bar to reschedule it. Dependent tasks move with it.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="plan-start" className="text-xs font-normal text-fg-subtle">Start</Label>
            <Input
              id="plan-start"
              type="date"
              value={plan.startDate}
              onChange={(e) => e.target.value && dispatch({ type: "plan.start", startDate: e.target.value })}
              className="h-8 w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="plan-deadline" className="text-xs font-normal text-fg-subtle">Deadline</Label>
            <Input
              id="plan-deadline"
              type="date"
              value={plan.endDate}
              min={addDays(plan.startDate, 1)}
              onChange={(e) => e.target.value && dispatch({ type: "plan.deadline", endDate: e.target.value })}
              className="h-8 w-40"
            />
          </div>
          <p className="pb-2 text-xs text-fg-subtle">{formatSpan(plan.startDate, plan.endDate)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex">
          {/* Labels */}
          <div className="w-[150px] shrink-0 border-r border-border sm:w-[230px]">
            <div style={{ height: HEADER }} className="border-b border-border" />
            <div style={{ height: ROW }} className="flex items-center gap-2 border-b border-border px-3 text-xs font-medium text-fg-subtle">
              <Flag className="size-3" aria-hidden /> Milestones
            </div>
            {rows.map((r) =>
              r.kind === "phase" ? (
                <div key={r.id} style={{ height: ROW }} className="flex items-center bg-surface-2/60 px-3 text-xs font-semibold text-fg">
                  <span className="mr-1.5 tabular-nums text-accent">{r.index + 1}</span>
                  <span className="truncate">{plan.phases[r.index].title}</span>
                </div>
              ) : (
                <button
                  key={r.task.id}
                  type="button"
                  onClick={() => openTask(r.task.id)}
                  style={{ height: ROW }}
                  className={cn(
                    "flex w-full items-center truncate px-3 pl-6 text-left text-[13px] transition-colors hover:bg-surface-2",
                    r.task.status === "done" ? "text-fg-subtle line-through" : "text-fg",
                  )}
                >
                  <span className="truncate">{r.task.title}</span>
                </button>
              ),
            )}
          </div>

          {/* Chart */}
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-thin">
            <div className="relative" style={{ width, height: HEADER + height }}>
              {/* Week grid + header */}
              {weeks.map((w) => {
                const d = parseDate(w);
                return (
                  <div key={w} className="absolute top-0 border-l border-border" style={{ left: x(w), height: HEADER + height }}>
                    <div className="px-2 pt-2 text-[11px] leading-tight text-fg-subtle">
                      <span className="font-medium text-fg-muted">{monthNames.short[d.getUTCMonth()]} {d.getUTCDate()}</span>
                      <br />
                      Week {Math.floor(diffDays(w, plan.startDate) / 7) + 1}
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-x-0 border-b border-border" style={{ top: HEADER }} />
              {/* Phase row tints */}
              {rows.map((r, i) =>
                r.kind === "phase" ? (
                  <div key={r.id} className="absolute inset-x-0 bg-surface-2/60" style={{ top: HEADER + ROW * (i + 1), height: ROW }} />
                ) : null,
              )}
              {/* Today */}
              {today >= start && today <= end && (
                <div className="absolute z-20 w-px bg-danger/70" style={{ left: x(today) + dayW / 2, top: HEADER - 6, height: height + 6 }}>
                  <span className="absolute -left-[3px] -top-1 size-[7px] rounded-full bg-danger" />
                </div>
              )}

              {/* Milestones lane */}
              {plan.milestones.map((m) => (
                <div
                  key={m.id}
                  className="absolute z-10 flex items-center gap-1.5"
                  style={{ left: x(m.date) + dayW / 2 - 6, top: HEADER + ROW / 2 - 6 }}
                  title={`${m.title} · ${formatShort(m.date)}`}
                >
                  <span className={cn("block size-3 rotate-45 rounded-[3px]", m.reached ? "bg-success" : "bg-fg")} />
                  {dayW >= 14 && <span className="whitespace-nowrap text-[11px] text-fg-muted">{m.title}</span>}
                </div>
              ))}

              {/* Dependency links */}
              <svg className="pointer-events-none absolute left-0 z-0" style={{ top: HEADER }} width={width} height={height} aria-hidden>
                {plan.tasks.flatMap((t) =>
                  t.dependsOn.map((depId) => {
                    const dep = plan.tasks.find((x) => x.id === depId);
                    const a = rowIndex.get(depId);
                    const b = rowIndex.get(t.id);
                    if (!dep || a === undefined || b === undefined) return null;
                    const x1 = x(dep.dueDate) + dayW;
                    const y1 = ROW * (a + 1) + ROW / 2;
                    const x2 = x(t.startDate);
                    const y2 = ROW * (b + 1) + ROW / 2;
                    const mid = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10));
                    return (
                      <motion.path
                        key={`${depId}-${t.id}`}
                        d={`M${x1},${y1} H${mid} V${y2} H${x2 - 2}`}
                        animate={{ d: `M${x1},${y1} H${mid} V${y2} H${x2 - 2}` }}
                        transition={spring.soft}
                        fill="none"
                        stroke="var(--accent-line)"
                        strokeWidth={1}
                      />
                    );
                  }),
                )}
              </svg>

              {/* Bars */}
              {rows.map((r, i) => {
                const top = HEADER + ROW * (i + 1);
                if (r.kind === "phase") {
                  const p = plan.phases[r.index];
                  return (
                    <motion.div
                      key={r.id}
                      className="absolute z-10 rounded-full bg-accent/25"
                      initial={false}
                      animate={{ left: x(p.startDate), width: (diffDays(p.endDate, p.startDate) + 1) * dayW }}
                      transition={spring.soft}
                      style={{ top: top + ROW / 2 - 2, height: 4 }}
                    />
                  );
                }
                return (
                  <TaskBar
                    key={r.task.id}
                    task={r.task}
                    top={top + 7}
                    left={x(r.task.startDate)}
                    width={(diffDays(r.task.dueDate, r.task.startDate) + 1) * dayW}
                    dayW={dayW}
                    onOpen={() => openTask(r.task.id)}
                    onMove={(days) =>
                      dispatch({ type: "task.update", taskId: r.task.id, patch: { startDate: addDays(r.task.startDate, days) } })
                    }
                    onResize={(days) =>
                      dispatch({
                        type: "task.update",
                        taskId: r.task.id,
                        patch: { dueDate: addDays(r.task.dueDate, Math.max(days, -diffDays(r.task.dueDate, r.task.startDate))) },
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskBar({
  task,
  top,
  left,
  width,
  dayW,
  onOpen,
  onMove,
  onResize,
}: {
  task: Task;
  top: number;
  left: number;
  width: number;
  dayW: number;
  onOpen: () => void;
  onMove: (days: number) => void;
  onResize: (days: number) => void;
}) {
  const [drag, setDrag] = useState<{ mode: "move" | "resize"; dx: number } | null>(null);
  const origin = useRef(0);
  const moved = useRef(false);
  const done = task.status === "done";

  const begin = (mode: "move" | "resize", e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    origin.current = e.clientX;
    moved.current = false;
    setDrag({ mode, dx: 0 });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - origin.current;
    if (Math.abs(dx) > 3) moved.current = true;
    setDrag({ ...drag, dx });
  };
  const end = () => {
    if (!drag) return;
    const days = Math.round(drag.dx / dayW);
    setDrag(null);
    if (!moved.current) {
      if (drag.mode === "move") onOpen();
      return;
    }
    if (days !== 0) (drag.mode === "move" ? onMove : onResize)(days);
  };

  const snapped = drag ? Math.round(drag.dx / dayW) * dayW : 0;
  const shownLeft = left + (drag?.mode === "move" ? snapped : 0);
  const shownWidth = Math.max(dayW, width + (drag?.mode === "resize" ? snapped : 0));

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${task.title}, ${formatShort(task.startDate)} to ${formatShort(task.dueDate)}. Press left or right arrow to move by a day.`}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
        if (e.key === "ArrowRight") onMove(1);
        if (e.key === "ArrowLeft") onMove(-1);
      }}
      onPointerDown={(e) => begin("move", e)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => setDrag(null)}
      initial={false}
      animate={{ left: shownLeft, width: shownWidth }}
      transition={drag ? { duration: 0 } : spring.soft}
      style={{ top, height: ROW - 14 }}
      className={cn(
        "group absolute z-10 flex touch-none select-none items-center overflow-hidden rounded-md px-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        drag ? "cursor-grabbing shadow-md" : "cursor-grab",
        done
          ? "bg-surface-3 text-fg-subtle line-through"
          : task.priority === "high"
            ? "bg-accent text-accent-fg"
            : task.priority === "medium"
              ? "bg-[color-mix(in_oklab,var(--accent)_38%,var(--surface))] text-fg"
              : "bg-surface-3 text-fg-muted ring-1 ring-inset ring-border-strong",
      )}
      title={`${task.title} · ${formatShort(task.startDate)} – ${formatShort(task.dueDate)}`}
    >
      {shownWidth > 70 && <span className="truncate">{task.title}</span>}
      <span
        onPointerDown={(e) => begin("resize", e)}
        onPointerMove={move}
        onPointerUp={end}
        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        <span className="absolute inset-y-1.5 right-[3px] w-[2px] rounded-full bg-current opacity-60" />
      </span>
    </motion.div>
  );
}
