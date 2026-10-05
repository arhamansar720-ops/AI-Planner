"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { spring } from "@/lib/motion";
import { formatRange } from "@/lib/planning/dates";
import { planMeta, progress } from "@/lib/planning/selectors";
import { usePlanStore } from "./plan-store";

export function PlanHeader({ handoff }: { handoff: boolean }) {
  const { plan, dispatch } = usePlanStore();
  const meta = planMeta(plan);
  const { done, total, ratio } = progress(plan);

  return (
    <header className="flex flex-col gap-3">
      {plan.prompt && (
        <motion.p
          layoutId={handoff ? "prompt-surface" : undefined}
          transition={spring.travel}
          className="flex max-w-full items-start gap-2 text-[13px] text-fg-subtle"
          style={{ borderRadius: 8 }}
        >
          <Quote className="mt-[3px] size-3 shrink-0" aria-hidden />
          <span className="line-clamp-1" title={plan.prompt}>
            {plan.prompt}
          </span>
        </motion.p>
      )}
      <EditableTitle
        value={plan.title}
        onCommit={(title) => title !== plan.title && dispatch({ type: "plan.update", patch: { title } })}
      />
      {plan.description && <p className="max-w-2xl text-[15px] leading-relaxed text-fg-muted">{plan.description}</p>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-muted">
        <span>{meta.span}</span>
        <Dot />
        <span>{meta.priorityLabel}</span>
        <Dot />
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${plan.status === "completed" ? "bg-success" : "bg-accent"}`}
            aria-hidden
          />
          {meta.statusLabel}
        </span>
        <span className="text-fg-subtle">· {formatRange(plan.startDate, plan.endDate)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan progress"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-accent"
            initial={false}
            animate={{ scaleX: ratio }}
            transition={spring.soft}
          />
        </div>
        <span className="text-xs tabular-nums text-fg-subtle">
          {done} of {total} tasks
        </span>
      </div>
    </header>
  );
}

function Dot() {
  return <span className="text-fg-subtle" aria-hidden>·</span>;
}

function EditableTitle({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- follow external renames (e.g. by the assistant)
  useEffect(() => setDraft(value), [value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={1}
      maxLength={200}
      aria-label="Plan title"
      onChange={(e) => setDraft(e.target.value.replace(/\n/g, ""))}
      onBlur={() => {
        const v = draft.trim();
        if (v) onCommit(v);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(value);
          requestAnimationFrame(() => e.currentTarget?.blur());
        }
      }}
      className="-mx-1.5 resize-none overflow-hidden rounded-lg bg-transparent px-1.5 text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-fg outline-none transition-colors hover:bg-surface-2/60 focus:bg-surface-2/60 sm:text-[32px]"
    />
  );
}
