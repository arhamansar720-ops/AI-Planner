"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

/** The submitted prompt, now the persistent source material above the canvas. */
export function PromptHeader({
  prompt,
  contextCount,
  onEdit,
  editLabel,
}: {
  prompt: string;
  contextCount: number;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <motion.div
      layoutId="prompt-surface"
      transition={spring.travel}
      style={{ borderRadius: 16 }}
      className="relative z-10 flex w-full max-w-[720px] items-center gap-3 border border-border bg-surface py-2.5 pl-4 pr-2 shadow-sm"
    >
      <motion.p
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.3 }}
        className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug text-fg"
        title={prompt}
      >
        {prompt}
      </motion.p>
      {contextCount > 0 && (
        <span className="hidden shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-subtle sm:inline">
          +{contextCount} context
        </span>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <Button variant="ghost" size="xs" onClick={onEdit}>
          {editLabel}
        </Button>
      </motion.div>
    </motion.div>
  );
}
