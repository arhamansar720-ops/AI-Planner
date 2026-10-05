"use client";

import { motion, useAnimate } from "framer-motion";
import { ArrowUp, FileText, Layers, Link2, NotebookPen, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Kbd } from "@/components/ui/field";
import { Tooltip } from "@/components/ui/overlays";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";
import type { ContextItemInput } from "@/lib/validation/api";
import type { PlanSummary } from "@/types/plan";
import { AddContextButton } from "./context-menu";
import { LocalModelChip } from "./local-model-chip";

export type ComposerHandle = { focus: () => void };

const CONTEXT_ICONS = { note: NotebookPen, link: Link2, file: FileText, plan: Layers } as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  context: ContextItemInput[];
  onContextChange: (items: ContextItemInput[]) => void;
  recentPlans: PlanSummary[];
};

export const PromptComposer = forwardRef<ComposerHandle, Props>(function PromptComposer(
  { value, onChange, onSubmit, context, onContextChange, recentPlans },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [buttonScope, animateButton] = useAnimate();
  const canSubmit = value.trim().length >= 2;

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  // Grow with content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 104), 300)}px`;
  }, [value]);

  // "/" focuses the prompt from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || target.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      textareaRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!canSubmit) {
      textareaRef.current?.focus();
      return;
    }
    void animateButton(buttonScope.current, { scale: [1, 0.86, 1.06, 1] }, { duration: 0.42, ease: "easeOut" });
    // Let the press register before the surface starts to travel.
    window.setTimeout(onSubmit, 140);
  };

  return (
    <motion.form
      layoutId="prompt-surface"
      transition={spring.travel}
      style={{ borderRadius: 22 }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "group relative z-10 w-full max-w-[720px] border border-border bg-surface shadow-md",
        "transition-[border-color,box-shadow] duration-200",
        "focus-within:border-accent-line focus-within:shadow-[0_0_0_4px_var(--accent-soft),var(--shadow-md)]",
      )}
    >
      <label htmlFor="prompt" className="sr-only">
        Describe what you want to accomplish
      </label>
      <textarea
        id="prompt"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") e.currentTarget.blur();
        }}
        placeholder="Tell me what you want to accomplish…"
        rows={3}
        maxLength={8000}
        autoFocus
        className="block w-full resize-none bg-transparent px-5 pt-[18px] text-[16px] leading-[1.6] text-fg outline-none placeholder:text-fg-subtle sm:text-[17px]"
      />

      {context.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-4 pb-1 pt-2" aria-label="Attached context">
          {context.map((item, i) => {
            const Icon = CONTEXT_ICONS[item.kind];
            return (
              <motion.li
                key={`${item.kind}-${item.label}-${i}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring.snap}
                className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-border bg-surface-2 py-1 pl-2 pr-1 text-xs text-fg-muted"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
                <button
                  type="button"
                  onClick={() => onContextChange(context.filter((_, j) => j !== i))}
                  className="rounded p-0.5 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                  aria-label={`Remove ${item.label}`}
                >
                  <X className="size-3" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-1 px-3 pb-3 pt-1.5">
        <AddContextButton
          recentPlans={recentPlans}
          disabled={context.length >= 6}
          onAdd={(item) => onContextChange([...context, item])}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden items-center gap-1 text-xs text-fg-subtle opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 sm:flex">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <LocalModelChip />
          <Tooltip content="Build plan" shortcut="⌘↵" side="top">
            <motion.button
              ref={buttonScope}
              type="submit"
              aria-label="Build plan"
              aria-disabled={!canSubmit}
              whileTap={canSubmit ? { scale: 0.9 } : undefined}
              transition={spring.press}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full transition-colors duration-200",
                canSubmit ? "bg-fg text-bg hover:bg-fg/85" : "bg-surface-3 text-fg-subtle",
              )}
            >
              <ArrowUp className="size-[18px]" strokeWidth={2.2} />
            </motion.button>
          </Tooltip>
        </div>
      </div>
    </motion.form>
  );
});
