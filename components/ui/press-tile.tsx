"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotionConfig, useSpring, useTransform, type Variants } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Size = "lg" | "md" | "sm";

/** How far the face sits above its base, i.e. how far a press travels. */
const DEPTH: Record<Size, number> = { lg: 8, md: 6, sm: 4 };
const RADIUS: Record<Size, string> = { lg: "rounded-[24px]", md: "rounded-[18px]", sm: "rounded-[12px]" };

const press = { type: "spring", stiffness: 700, damping: 28, mass: 0.6 } as const;

/**
 * A big physical key. The face floats above a visible base: on hover it lifts
 * and tilts toward the pointer, on press it travels all the way down into the
 * base, and when selected it stays partly sunk with an accent edge.
 */
export function PressTile({
  emoji,
  label,
  hint,
  selected = false,
  size = "lg",
  role = "radio",
  onClick,
  className,
  children,
  disabled,
  tone = "default",
}: {
  emoji?: string;
  label: string;
  hint?: string;
  selected?: boolean;
  size?: Size;
  role?: "radio" | "checkbox" | "button";
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  /** "accent" is a solid primary key for the main action. */
  tone?: "default" | "accent";
}) {
  const reduce = useReducedMotionConfig();
  const depth = DEPTH[size];
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tilt = size === "sm" ? 4 : 7;
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [tilt, -tilt]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-tilt, tilt]), { stiffness: 260, damping: 22 });

  const face: Variants = {
    rest: { y: 0 },
    selected: { y: depth * 0.5 },
    hover: { y: reduce ? 0 : -3 },
    press: { y: depth },
  };
  const icon: Variants = {
    rest: { scale: 1, rotate: 0, y: 0 },
    selected: { scale: 1.06, rotate: 0, y: 0 },
    hover: reduce ? { scale: 1 } : { scale: 1.14, rotate: -7, y: -2 },
    press: { scale: 0.9, rotate: 0, y: 1 },
  };

  const checked = role === "button" ? undefined : selected;
  const accent = tone === "accent";

  return (
    <motion.button
      type="button"
      role={role === "button" ? undefined : role}
      aria-checked={checked}
      aria-label={hint ? `${label}. ${hint}` : label}
      disabled={disabled}
      onClick={onClick}
      initial={false}
      animate={selected ? "selected" : "rest"}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "press"}
      onTapStart={() => {
        try {
          navigator.vibrate?.(8);
        } catch {}
      }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      style={{ paddingBottom: depth, perspective: 900 }}
      className={cn(
        "group relative block w-full select-none text-left outline-none disabled:pointer-events-none disabled:opacity-45",
        RADIUS[size],
        className,
      )}
    >
      {/* The base: the key's visible side. */}
      <span
        aria-hidden
        style={{ top: depth }}
        className={cn(
          "absolute inset-x-0 bottom-0 transition-[background-color,box-shadow] duration-200",
          RADIUS[size],
          selected || accent
            ? "bg-[var(--key-edge-active)] shadow-[0_14px_28px_-14px_var(--accent)]"
            : "bg-[var(--key-edge)] shadow-[0_12px_24px_-14px_rgb(0_0_0/0.4)]",
        )}
      />
      {/* The face. */}
      <motion.span
        variants={face}
        transition={press}
        style={{ rotateX, rotateY }}
        className={cn(
          "relative flex border shadow-[inset_0_1px_0_var(--glass-highlight)] transition-[background-color,border-color] duration-200",
          "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring",
          RADIUS[size],
          accent
            ? "border-[color-mix(in_srgb,var(--accent)_70%,white)] bg-accent text-accent-fg group-hover:bg-accent-hover"
            : selected
            ? "border-accent bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]"
            : "border-border-strong bg-surface group-hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border-strong))]",
          size === "lg" && "min-h-[172px] flex-col items-start justify-between gap-6 p-5 sm:p-6",
          size === "md" && "min-h-[64px] items-center gap-3 px-4 py-3",
          accent && "justify-center",
          size === "sm" && "h-11 items-center justify-center px-2",
        )}
      >
        {emoji && (
          <motion.span
            variants={icon}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            aria-hidden
            className={cn(
              "inline-block origin-bottom leading-none drop-shadow-[0_6px_8px_rgb(0_0_0/0.14)]",
              size === "lg" ? "text-[52px]" : size === "md" ? "text-[28px]" : "text-[18px]",
            )}
          >
            {emoji}
          </motion.span>
        )}
        <span className={cn("flex min-w-0 flex-col", size === "sm" && "items-center")}>
          <span
            className={cn(
              "font-semibold tracking-[-0.015em]",
              accent ? "text-accent-fg" : "text-fg",
              size === "lg" ? "text-[17px]" : size === "md" ? "text-[14.5px]" : "text-[13px]",
            )}
          >
            {label}
          </span>
          {hint && (
            <span className={cn(accent ? "text-accent-fg/80" : "text-fg-muted", size === "lg" ? "mt-1 text-[13.5px] leading-snug" : "text-[12.5px]")}>{hint}</span>
          )}
          {children}
        </span>
        <AnimatePresence>
          {selected && !accent && size !== "sm" && (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              aria-hidden
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg",
                size === "lg" ? "absolute right-4 top-4 size-6" : "ml-auto size-5",
              )}
            >
              <Check className={size === "lg" ? "size-3.5" : "size-3"} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}
