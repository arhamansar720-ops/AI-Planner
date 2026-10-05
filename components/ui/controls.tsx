"use client";

import { motion } from "framer-motion";
import { Switch as S } from "radix-ui";
import { useId } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

/* Switch ------------------------------------------------------------------- */

export function Switch({
  checked,
  onCheckedChange,
  id,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  label?: string;
}) {
  return (
    <S.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border border-transparent bg-surface-3 transition-colors duration-200 data-[state=checked]:bg-accent"
    >
      <S.Thumb className="block size-[18px] translate-x-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-quint)] data-[state=checked]:translate-x-[17px]" />
    </S.Root>
  );
}

/* Segmented control -------------------------------------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  size?: "sm" | "md";
  className?: string;
  label: string;
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-[10px] border border-border bg-surface-2 p-0.5", className)}
      onKeyDown={(e) => {
        const i = options.findIndex((o) => o.value === value);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(options[(i + 1) % options.length].value);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(options[(i - 1 + options.length) % options.length].value);
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 [&_svg]:size-3.5",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                className="absolute inset-0 rounded-lg border border-border bg-surface shadow-xs"
                transition={spring.snap}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* Round task checkbox ------------------------------------------------------ */

export function TaskCheck({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? 16 : 18;
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      whileTap={{ scale: 0.85 }}
      transition={spring.press}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface hover:border-accent-line",
      )}
      style={{ width: dim, height: dim }}
    >
      <svg viewBox="0 0 16 16" className="size-[70%]" fill="none" aria-hidden>
        <motion.path
          d="M3.5 8.5l3 3 6-6.5"
          stroke="var(--accent-fg)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </motion.button>
  );
}
