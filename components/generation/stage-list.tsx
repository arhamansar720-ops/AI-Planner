"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ease } from "@/lib/motion";
import { STAGES, stageIndex, type StageId } from "@/lib/planning/stages";
import { cn } from "@/lib/utils/cn";

export function StageList({ stage, complete }: { stage: StageId | null; complete: boolean }) {
  const current = stage ? stageIndex(stage) : -1;
  return (
    <ol className="relative flex flex-col gap-[18px]" aria-label="Planning progress">
      {/* Track */}
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
      <motion.span
        className="absolute left-[7px] top-2 w-px origin-top bg-accent-line"
        style={{ bottom: 8 }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: complete ? 1 : Math.max(0, current) / (STAGES.length - 1) }}
        transition={{ duration: 0.8, ease: ease.expo }}
        aria-hidden
      />
      {STAGES.map((s, i) => {
        const done = complete || i < current;
        const active = !complete && i === current;
        return (
          <li key={s.id} className="relative flex items-center gap-3">
            <span className="relative flex size-[15px] shrink-0 items-center justify-center">
              {done ? (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: ease.expo }}
                  className="flex size-[15px] items-center justify-center rounded-full bg-surface ring-1 ring-accent-line"
                >
                  <Check className="size-2.5 text-accent" strokeWidth={3} />
                </motion.span>
              ) : active ? (
                <span className="flex size-[15px] items-center justify-center rounded-full bg-surface ring-1 ring-accent">
                  <span className="pulse-dot size-[5px] rounded-full bg-accent" />
                </span>
              ) : (
                <span className="size-[15px] rounded-full bg-surface ring-1 ring-border-strong" />
              )}
            </span>
            <span
              className={cn(
                "text-[13px] transition-colors duration-300",
                active ? "font-medium text-fg" : done ? "text-fg-muted" : "text-fg-subtle",
              )}
            >
              {s.label}
            </span>
            <span className="sr-only">{done ? "(done)" : active ? "(in progress)" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
