"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Cycles through words inside a pill whose width eases to fit each word.
 * Words slide through like a slot machine (old out the top, new in from
 * below), so there is always text in the pill.
 * Every word is measured up front, so the pill never collapses, jumps or
 * squashes its text while it changes.
 */
export function RotatingWord({
  words,
  interval = 2600,
  className,
}: {
  words: readonly string[];
  interval?: number;
  className?: string;
}) {
  const reduce = useReducedMotionConfig();
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Measure every word in the real font (and again once web fonts load).
  useLayoutEffect(() => {
    const measure = () => {
      const el = measureRef.current;
      if (!el) return;
      setWidths(Array.from(el.children, (c) => (c as HTMLElement).getBoundingClientRect().width));
    };
    measure();
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (measureRef.current) observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, [words]);

  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(t);
  }, [words.length, interval, reduce]);

  const width = widths[index];

  return (
    <span className={cn("relative inline-flex", className)}>
      {/* Invisible copies used only for measuring. */}
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap">
        {words.map((w) => (
          <span key={w} className="px-[0.32em]">
            {w}
          </span>
        ))}
      </span>
      <span className="sr-only">{words[index]}</span>
      <motion.span
        aria-hidden
        className="relative inline-flex h-[1.18em] items-center overflow-hidden rounded-[0.3em] bg-accent text-accent-fg shadow-[0_18px_40px_-18px_var(--accent)]"
        initial={false}
        animate={width ? { width } : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={words[index]}
            className="whitespace-nowrap px-[0.32em]"
            initial={{ y: "105%", opacity: 0.6 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-105%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 210, damping: 26, mass: 0.9 }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  );
}
