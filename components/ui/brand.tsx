import { product } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

/** The mark: three bars resolving from long to short — an idea becoming structure. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("size-5", className)} aria-hidden fill="none">
      <rect x="2" y="2" width="16" height="16" rx="5" fill="currentColor" />
      <rect x="5.5" y="5.75" width="9" height="1.9" rx=".95" className="fill-bg" />
      <rect x="5.5" y="9.05" width="6.2" height="1.9" rx=".95" className="fill-bg" fillOpacity=".7" />
      <rect x="5.5" y="12.35" width="3.4" height="1.9" rx=".95" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">{product.name}</span>
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-fg-muted ring-1 ring-border",
        className,
      )}
      aria-hidden
    >
      {initials || "·"}
    </span>
  );
}
