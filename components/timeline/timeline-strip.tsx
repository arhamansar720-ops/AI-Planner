"use client";

import { motion } from "framer-motion";
import { ease } from "@/lib/motion";
import { diffDays, formatShort, localToday } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import type { Milestone, Phase } from "@/types/plan";

/**
 * A compact horizontal timeline: phases as segments, milestones as markers.
 * Used both inside the planning canvas (assembling live) and at the top of
 * the plan overview.
 */
export function TimelineStrip({
  start,
  end,
  phases,
  milestones,
  layoutId,
  showToday,
  className,
  assemble = true,
}: {
  start: string;
  end: string;
  phases: Phase[];
  milestones: Milestone[];
  layoutId?: string;
  showToday?: boolean;
  className?: string;
  assemble?: boolean;
}) {
  const span = Math.max(1, diffDays(end, start) + 1);
  const pos = (d: string) => Math.min(100, Math.max(0, (diffDays(d, start) / span) * 100));
  const weeks = Math.max(1, Math.ceil(span / 7));
  const labelEvery = weeks <= 6 ? 1 : Math.ceil(weeks / 6);
  const today = localToday();
  const todayPos = today >= start && today <= end ? pos(today) : null;

  return (
    <motion.div layoutId={layoutId} className={cn("relative w-full", className)}>
      <div className="relative h-9">
        {/* Track */}
        <motion.div
          className="absolute inset-x-0 top-[13px] h-px origin-left bg-border-strong"
          initial={assemble ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: ease.expo }}
        />
        {/* Phase segments */}
        {phases.map((p, i) => {
          const left = pos(p.startDate);
          const width = Math.max(1.5, pos(p.endDate) + 100 / span - left);
          return (
            <motion.div
              key={p.id}
              className="absolute top-[10px] h-[7px] origin-left rounded-full"
              style={{
                left: `${left}%`,
                width: `calc(${width}% - 3px)`,
                background: i % 2 ? "var(--accent-line)" : "var(--accent)",
                opacity: i % 2 ? 0.55 : 0.75,
              }}
              initial={assemble ? { scaleX: 0, opacity: 0 } : false}
              animate={{ scaleX: 1, opacity: i % 2 ? 0.55 : 0.75 }}
              transition={{ duration: 0.7, ease: ease.expo, delay: assemble ? 0.15 + i * 0.08 : 0 }}
              title={`${p.title} · ${formatShort(p.startDate)} – ${formatShort(p.endDate)}`}
            />
          );
        })}
        {/* Milestones */}
        {milestones.map((m, i) => (
          <motion.div
            key={m.id}
            className="absolute top-[7px] -ml-[6.5px]"
            style={{ left: `${pos(m.date)}%` }}
            initial={assemble ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 24, delay: assemble ? 0.3 + i * 0.06 : 0 }}
            title={`${m.title} · ${formatShort(m.date)}`}
          >
            <span className="block size-[13px] rotate-45 rounded-[3px] border-2 border-bg bg-fg" />
          </motion.div>
        ))}
        {showToday && todayPos !== null && (
          <div className="absolute -top-0.5 bottom-0 w-px bg-danger/70" style={{ left: `${todayPos}%` }} aria-hidden>
            <span className="absolute -left-[2.5px] -top-0.5 size-[6px] rounded-full bg-danger" />
          </div>
        )}
      </div>
      <div className="relative h-4 text-[10.5px] tabular-nums text-fg-subtle">
        {Array.from({ length: weeks }, (_, w) => w)
          .filter((w) => w % labelEvery === 0)
          .map((w) => (
            <span key={w} className="absolute -translate-x-0" style={{ left: `${Math.min(92, (w * 7 * 100) / span)}%` }}>
              Week {w + 1}
            </span>
          ))}
      </div>
    </motion.div>
  );
}
