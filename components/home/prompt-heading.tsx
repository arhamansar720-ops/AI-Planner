"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ease } from "@/lib/motion";
import { HEADINGS } from "./phrases";

export function PromptHeading({ index }: { index: number }) {
  return (
    <h1 className="relative grid h-[44px] w-full place-items-center text-center sm:h-[52px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: ease.expo }}
          className="col-start-1 row-start-1 text-balance text-[30px] font-medium leading-tight tracking-[-0.035em] text-fg sm:text-[40px]"
        >
          {HEADINGS[index]}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}
