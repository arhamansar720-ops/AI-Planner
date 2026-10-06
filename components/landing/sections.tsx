"use client";

import { motion } from "framer-motion";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

/** A small mono label: an optional index, a hairline, and the section name. */
export function Eyebrow({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-fg-subtle", className)}>
      {index && <span className="text-accent">{index}</span>}
      {index && <span className="h-px w-6 bg-border-strong" aria-hidden />}
      {children}
    </p>
  );
}

/**
 * Section header. Left-aligned by default: the title on the left and the
 * supporting line on the right on wide screens, like an editorial spread.
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  lede,
  id,
  align = "left",
}: {
  eyebrow: string;
  index?: string;
  title: string;
  lede?: string;
  id?: string;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: ease.expo }}
      className={cn(
        "mx-auto mb-12 w-full max-w-[1120px] sm:mb-16",
        center ? "flex max-w-[680px] flex-col items-center text-center" : "grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16",
      )}
    >
      <div className={cn(center && "flex flex-col items-center")}>
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
        <h2
          id={id}
          className={cn(
            "mt-4 text-balance text-[clamp(2rem,4.2vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-fg",
            !center && "max-w-[15ch]",
          )}
        >
          {title}
        </h2>
      </div>
      {lede && (
        <p className={cn("text-pretty text-[16.5px] leading-[1.6] text-fg-muted", center ? "mt-5 max-w-[560px]" : "max-w-[460px] lg:justify-self-end lg:pb-1.5")}>
          {lede}
        </p>
      )}
    </motion.div>
  );
}
