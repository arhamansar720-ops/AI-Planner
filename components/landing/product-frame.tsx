"use client";

import { motion, useReducedMotionConfig, useScroll, useTransform } from "framer-motion";
import { History, Lock, Plus } from "lucide-react";
import { useRef } from "react";
import { Wordmark } from "@/components/ui/brand";
import { cn } from "@/lib/utils/cn";

/**
 * The product, shown as the product: a quiet browser window around real UI.
 * It starts tipped back and settles flat as it scrolls into view.
 */
export function ProductFrame({
  children,
  url = "forma.app/app",
  appChrome = true,
  className,
}: {
  children: React.ReactNode;
  url?: string;
  appChrome?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 14, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.93, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, 0]);

  return (
    <div ref={ref} className={cn("relative mx-auto w-full max-w-[1200px] [perspective:1800px]", className)}>
      {/* Light falling on the window from above, and its reflection below. */}
      <div
        className="pointer-events-none absolute inset-x-[8%] -top-24 -z-10 h-64 rounded-full bg-accent opacity-[0.10] blur-[90px] dark:opacity-[0.2]"
        aria-hidden
      />
      <motion.div
        style={{ rotateX, scale, y, transformOrigin: "50% 0%" }}
        className="relative overflow-hidden rounded-[18px] border border-border-strong bg-bg shadow-[0_1px_0_var(--glass-highlight)_inset,0_50px_120px_-40px_rgb(0_0_0/0.35),0_20px_40px_-30px_rgb(0_0_0/0.3)]"
      >
        <div className="flex h-10 items-center gap-3 border-b border-border bg-surface-2/80 px-4" aria-hidden>
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]/90" />
            <span className="size-2.5 rounded-full bg-[#febc2e]/90" />
            <span className="size-2.5 rounded-full bg-[#28c840]/90" />
          </span>
          <span className="mx-auto flex h-6 min-w-0 max-w-[320px] flex-1 items-center justify-center gap-1.5 rounded-md bg-bg/80 px-3 font-mono text-[11px] text-fg-subtle ring-1 ring-border">
            <Lock className="size-3 shrink-0" />
            <span className="truncate">{url}</span>
          </span>
          <span className="w-[54px]" />
        </div>
        <div className="app-grain relative">
          <div className="app-backdrop app-backdrop-mask pointer-events-none absolute inset-0" aria-hidden />
          {appChrome && (
            <div className="relative flex h-12 items-center px-4 sm:px-5" aria-hidden>
              <Wordmark />
              <span className="ml-auto hidden items-center gap-4 text-[12.5px] text-fg-muted sm:flex">
                <span className="inline-flex items-center gap-1.5">
                  <History className="size-3.5" /> History
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="size-3.5" /> New Plan
                </span>
                <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold ring-1 ring-border">SR</span>
              </span>
            </div>
          )}
          <div className="relative">{children}</div>
        </div>
      </motion.div>
      {/* Fade the bottom edge into the page. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" aria-hidden />
    </div>
  );
}
