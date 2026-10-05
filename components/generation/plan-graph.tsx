"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TimelineStrip } from "@/components/timeline/timeline-strip";
import { ease, spring } from "@/lib/motion";
import { addDays, formatRange, formatShort, maxDate } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import type { DraftPlan, Task } from "@/types/plan";

const MAX_CARDS = 4;
const MAX_COLUMNS = 6;

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

/** Deterministic "scattered" starting offset for a card: chaos → structure. */
function scatter(id: string) {
  const h = Math.abs(hash(id));
  return { x: ((h % 57) - 28), y: 12 + (h % 23), rotate: ((h % 11) - 5) * 0.9 };
}

export const PRIORITY_DOT: Record<Task["priority"], string> = {
  high: "bg-accent",
  medium: "bg-fg-subtle",
  low: "bg-border-strong",
};

export function PlanGraph({ draft, streaming }: { draft: DraftPlan; streaming: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const phases = draft.phases.slice(0, MAX_COLUMNS);
  const hiddenPhases = draft.phases.length - phases.length;
  const columns = Math.max(1, phases.length);

  const tasksByPhase = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of draft.tasks) map.set(t.phaseId, [...(map.get(t.phaseId) ?? []), t]);
    return map;
  }, [draft.tasks]);

  const visibleTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of phases) for (const t of (tasksByPhase.get(p.id) ?? []).slice(0, MAX_CARDS)) ids.add(t.id);
    return ids;
  }, [phases, tasksByPhase]);

  const timelineEnd = useMemo(() => {
    const dates = [
      draft.meta?.endDate,
      ...draft.phases.map((p) => p.endDate),
      ...draft.milestones.map((m) => m.date),
    ].filter(Boolean) as string[];
    return dates.length ? dates.reduce(maxDate) : null;
  }, [draft]);
  const start = draft.meta?.startDate ?? draft.phases[0]?.startDate;
  const showTimeline = Boolean(start && timelineEnd && (draft.milestones.length > 0 || (!streaming && draft.phases.length)));

  return (
    <div ref={containerRef} className="relative flex h-full flex-col">
      <Connectors
        containerRef={containerRef}
        phaseIds={phases.map((p) => p.id)}
        tasks={draft.tasks.filter((t) => visibleTaskIds.has(t.id))}
        streaming={streaming}
        reduce={Boolean(reduce)}
      />

      {/* Goal */}
      <div className="flex justify-center">
        <motion.div
          data-node="goal"
          layout
          transition={spring.snap}
          className="relative z-10 max-w-[min(520px,100%)] rounded-2xl border border-border bg-surface px-4 py-2.5 text-center shadow-sm"
        >
          <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">Goal</p>
          <AnimatePresence mode="popLayout" initial={false}>
            {draft.meta ? (
              <motion.p
                key="title"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: ease.expo }}
                className="mt-0.5 text-balance text-[15px] font-medium tracking-[-0.01em] text-fg"
              >
                {draft.meta.title}
              </motion.p>
            ) : (
              <motion.div key="skeleton" exit={{ opacity: 0 }} className="mx-auto mt-1.5 h-3 w-44 rounded-full shimmer" />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Unstructured fragments before the first phase exists */}
      <AnimatePresence>
        {phases.length === 0 && (
          <motion.div
            key="fragments"
            className="pointer-events-none absolute inset-x-0 top-28 mx-auto h-40 w-full max-w-xl"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.4 } }}
            aria-hidden
          >
            {FRAGMENTS.map((f, i) => (
              <motion.span
                key={i}
                className="absolute h-2 rounded-full bg-surface-3"
                style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.w }}
                initial={{ opacity: 0 }}
                animate={
                  reduce
                    ? { opacity: 0.8 }
                    : { opacity: [0, 0.9, 0.6, 0.9], x: [0, f.dx, 0], y: [0, f.dy, 0] }
                }
                transition={{ duration: 5 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phases and tasks */}
      {phases.length > 0 && (
        <div
          className="mx-auto mt-9 grid w-full gap-3 md:max-w-[calc(var(--cols)*260px)] md:gap-4 [grid-template-columns:1fr] md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": columns } as React.CSSProperties}
        >
          {phases.map((phase, pi) => {
            const tasks = tasksByPhase.get(phase.id) ?? [];
            const shown = tasks.slice(0, MAX_CARDS);
            return (
              <motion.div
                key={phase.id}
                layout
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...spring.snap, opacity: { duration: 0.4 }, filter: { duration: 0.4 } }}
                className="flex min-w-0 flex-col gap-2"
              >
                <motion.div
                  data-node={`phase:${phase.id}`}
                  className="relative z-10 rounded-xl border border-border bg-surface px-3 py-2 shadow-xs"
                >
                  <p className="text-[10.5px] font-medium tabular-nums text-accent">Phase {pi + 1}</p>
                  <p className="truncate text-[13px] font-medium text-fg">{phase.title}</p>
                  <p className="text-[10.5px] tabular-nums text-fg-subtle">{formatRange(phase.startDate, phase.endDate)}</p>
                </motion.div>
                <div className="flex flex-col gap-1.5 md:pl-2">
                  {shown.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  <AnimatePresence>
                    {tasks.length > MAX_CARDS && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-1 text-[11px] tabular-nums text-fg-subtle"
                      >
                        +{tasks.length - MAX_CARDS} more
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      {hiddenPhases > 0 && (
        <p className="mt-2 text-right text-[11px] text-fg-subtle">+{hiddenPhases} more phases</p>
      )}

      {/* Timeline */}
      <div className="mt-auto pt-8">
        <AnimatePresence>
          {showTimeline && start && timelineEnd && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: ease.expo }}
            >
              <TimelineStrip
                layoutId="plan-timeline"
                start={start}
                end={maxDate(timelineEnd, addDays(start, 6))}
                phases={draft.phases}
                milestones={draft.milestones}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const from = scatter(task.id);
  return (
    <motion.div
      layout="position"
      data-node={`task:${task.id}`}
      initial={{ opacity: 0, x: from.x, y: from.y, rotate: from.rotate, filter: "blur(5px)" }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, filter: "blur(0px)" }}
      transition={{ ...spring.snap, opacity: { duration: 0.35 }, filter: { duration: 0.35 } }}
      className="relative z-10 rounded-[10px] border border-border bg-glass-strong px-2.5 py-1.5 shadow-xs"
    >
      <div className="flex items-start gap-1.5">
        <span className={cn("mt-[6px] size-[5px] shrink-0 rounded-full", PRIORITY_DOT[task.priority])} />
        <span className="line-clamp-2 text-[12px] leading-[1.35] text-fg">{task.title}</span>
      </div>
      <p className="mt-0.5 pl-[11px] text-[10.5px] tabular-nums text-fg-subtle">Due {formatShort(task.dueDate)}</p>
    </motion.div>
  );
}

const FRAGMENTS = [
  { x: 6, y: 18, w: 72, dx: 10, dy: -6 },
  { x: 30, y: 6, w: 44, dx: -8, dy: 8 },
  { x: 58, y: 22, w: 96, dx: 6, dy: 10 },
  { x: 80, y: 8, w: 52, dx: -10, dy: 4 },
  { x: 14, y: 58, w: 88, dx: 8, dy: -8 },
  { x: 44, y: 48, w: 60, dx: -6, dy: -10 },
  { x: 70, y: 64, w: 76, dx: 10, dy: 6 },
  { x: 36, y: 82, w: 40, dx: -8, dy: -4 },
];

/* ------------------------------------------------------------------------ */
/* Connectors                                                               */
/* ------------------------------------------------------------------------ */

type Line = { id: string; d: string; kind: "structure" | "dependency" };

function Connectors({
  containerRef,
  phaseIds,
  tasks,
  streaming,
  reduce,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  phaseIds: string[];
  tasks: Task[];
  streaming: boolean;
  reduce: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const key = phaseIds.join() + "|" + tasks.map((t) => t.id + t.dependsOn.join(".")).join();

  const measureRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    measureRef.current = () => {
      const root = containerRef.current;
      if (!root) return;
      const base = root.getBoundingClientRect();
      const rect = (id: string) => {
        const el = root.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top };
      };
      const next: Line[] = [];
      const goal = rect("goal");
      const stacked = window.matchMedia("(max-width: 767px)").matches;
      if (goal && !stacked) {
        for (const id of phaseIds) {
          const p = rect(`phase:${id}`);
          if (!p) continue;
          const sx = (goal.l + goal.r) / 2;
          const sy = goal.b;
          const ex = (p.l + p.r) / 2;
          const ey = p.t;
          const my = (sy + ey) / 2;
          next.push({ id: `g-${id}`, kind: "structure", d: `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}` });
        }
      }
      if (!stacked) {
        const visible = new Set(tasks.map((t) => t.id));
        const column = new Map(tasks.map((t) => [t.id, phaseIds.indexOf(t.phaseId)]));
        let count = 0;
        for (const t of tasks) {
          for (const dep of t.dependsOn) {
            if (!visible.has(dep) || count > 14) continue;
            // Long jumps would cut through other columns; the workspace shows those links instead.
            if (Math.abs((column.get(dep) ?? 0) - (column.get(t.id) ?? 0)) > 1) continue;
            const a = rect(`task:${dep}`);
            const b = rect(`task:${t.id}`);
            if (!a || !b) continue;
            count++;
            const acy = (a.t + a.b) / 2;
            const bcy = (b.t + b.b) / 2;
            let d: string;
            if (b.l > a.r - 4) {
              const mx = (a.r + b.l) / 2;
              d = `M${a.r},${acy} C${mx},${acy} ${mx},${bcy} ${b.l},${bcy}`;
            } else if (a.l > b.r - 4) {
              const mx = (a.l + b.r) / 2;
              d = `M${a.l},${acy} C${mx},${acy} ${mx},${bcy} ${b.r},${bcy}`;
            } else {
              const x = Math.min(a.l, b.l);
              d = `M${x},${acy} C${x - 12},${acy} ${x - 12},${bcy} ${x},${bcy}`;
            }
            next.push({ id: `d-${dep}-${t.id}`, kind: "dependency", d });
          }
        }
      }
      setLines(next);
      setSize({ w: base.width, h: base.height });
    };
  });

  useEffect(() => {
    // Measure once cards have settled into place.
    const timers = [120, 520, 950].map((ms) => window.setTimeout(() => measureRef.current(), ms));
    return () => timers.forEach(clearTimeout);
  }, [key]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(root);
    return () => ro.disconnect();
  }, [containerRef]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      width={size.w}
      height={size.h}
      aria-hidden
    >
      {lines.map((line) => (
        <g key={line.id}>
          <motion.path
            d={line.d}
            fill="none"
            stroke={line.kind === "structure" ? "var(--border-strong)" : "var(--accent-line)"}
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1, d: line.d }}
            transition={{ duration: 0.7, ease: ease.expo }}
          />
          {line.kind === "dependency" && streaming && !reduce && (
            <path d={line.d} fill="none" stroke="var(--accent)" strokeWidth={1.25} className="flow-line" opacity={0.55} />
          )}
        </g>
      ))}
    </svg>
  );
}
