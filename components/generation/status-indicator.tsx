"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

export function StatusIndicator({ label, state }: { label: string; state: "working" | "ready" | "error" | "waiting" }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium" role="status" aria-live="polite">
      <span className="relative flex size-4 items-center justify-center">
        {state === "ready" ? (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex size-4 items-center justify-center rounded-full bg-accent text-accent-fg"
          >
            <Check className="size-2.5" strokeWidth={3} />
          </motion.span>
        ) : (
          <>
            {state === "working" && <span className="ring-out absolute size-2 rounded-full bg-accent" />}
            <span
              className={cn(
                "relative size-2 rounded-full",
                state === "working" && "pulse-dot bg-accent",
                state === "waiting" && "bg-warning",
                state === "error" && "bg-danger",
              )}
            />
          </>
        )}
      </span>
      <span className="relative inline-grid overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.35, ease: ease.expo }}
            className={cn("col-start-1 row-start-1 whitespace-nowrap", state === "ready" ? "text-fg" : "text-fg-muted")}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
