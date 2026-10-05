"use client";

import { motion } from "framer-motion";
import { ease } from "@/lib/motion";
import { SUGGESTIONS } from "./phrases";

export function SuggestionChips({ onPick }: { onPick: (starter: string) => void }) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03, delayChildren: 0.25 } } }}
      className="flex max-w-[720px] flex-wrap justify-center gap-2"
      aria-label="Starting points"
    >
      {SUGGESTIONS.map((s) => (
        <motion.li
          key={s.label}
          variants={{
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.expo } },
          }}
        >
          <button
            type="button"
            onClick={() => onPick(s.starter)}
            className="h-8 rounded-full border border-border bg-surface/60 px-3.5 text-[13px] text-fg-muted transition-[background-color,color,border-color,transform] duration-150 hover:border-border-strong hover:bg-surface hover:text-fg active:scale-[0.97]"
          >
            {s.label}
          </button>
        </motion.li>
      ))}
    </motion.ul>
  );
}
