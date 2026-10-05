import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

const fieldBase =
  "w-full rounded-[10px] border border-border bg-surface text-sm text-fg shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-border-strong focus:border-accent-line focus:ring-4 focus:ring-accent-soft disabled:opacity-50 aria-invalid:border-danger";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-9 px-3", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-20 resize-none px-3 py-2 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(fieldBase, "h-9 appearance-none pl-3 pr-8")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-fg", className)} {...props} />;
}

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-surface-2 px-1 font-sans text-[11px] font-medium text-fg-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
