import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      aria-hidden
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Three quiet dots, used where a spinner would feel too mechanical. */
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="pulse-dot size-1 rounded-full bg-current"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}
