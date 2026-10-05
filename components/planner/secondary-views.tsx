"use client";

import { BookOpen, ExternalLink, GraduationCap, Link2, Package, Plus, Trash2, User, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TaskCheck } from "@/components/ui/controls";
import { Input, Select, Textarea } from "@/components/ui/field";
import { formatLong, formatShort, localToday } from "@/lib/planning/dates";
import { daysUntil } from "@/lib/planning/selectors";
import { cn } from "@/lib/utils/cn";
import type { ResourceKind } from "@/types/plan";
import { usePlanStore } from "./plan-store";

function ViewTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-semibold tracking-[-0.025em]">{title}</h1>
      <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
    </div>
  );
}

/* Milestones -------------------------------------------------------------- */

export function MilestonesView() {
  const { plan, dispatch } = usePlanStore();
  const today = localToday();
  return (
    <div className="flex flex-col gap-8">
      <ViewTitle title="Milestones" subtitle="The checkpoints that tell you the plan is working." />
      {plan.milestones.length === 0 ? (
        <p className="text-sm text-fg-muted">This plan has no milestones yet. Ask the assistant to suggest a few.</p>
      ) : (
        <ol className="relative flex flex-col">
          <span className="absolute bottom-3 left-[8px] top-3 w-px bg-border" aria-hidden />
          {plan.milestones.map((m) => {
            const phase = plan.phases.find((p) => p.id === m.phaseId);
            const days = daysUntil(m.date, today);
            return (
              <li key={m.id} className="relative flex gap-4 py-3">
                <div className="relative z-10 pt-0.5">
                  <TaskCheck
                    checked={m.reached}
                    onChange={() => dispatch({ type: "milestone.update", milestoneId: m.id, patch: { reached: !m.reached } })}
                    label={`Mark milestone “${m.title}” ${m.reached ? "not reached" : "reached"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className={cn("text-[15px] font-medium", m.reached && "text-fg-subtle line-through")}>{m.title}</p>
                    <p className="text-xs tabular-nums text-fg-subtle">
                      {formatLong(m.date)}
                      {!m.reached && (
                        <span className={cn("ml-2", days < 0 ? "text-danger" : "text-fg-muted")}>
                          {days === 0 ? "Today" : days > 0 ? `in ${days} ${days === 1 ? "day" : "days"}` : `${-days} days ago`}
                        </span>
                      )}
                    </p>
                  </div>
                  {m.description && <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{m.description}</p>}
                  {phase && <p className="mt-1.5 text-xs text-fg-subtle">{phase.title}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* Resources --------------------------------------------------------------- */

const KIND_ICON: Record<ResourceKind, React.ComponentType<{ className?: string }>> = {
  link: Link2,
  book: BookOpen,
  tool: Wrench,
  course: GraduationCap,
  person: User,
  other: Package,
};

export function ResourcesView() {
  const { plan, dispatch } = usePlanStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ResourceKind>("link");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <ViewTitle title="Resources" subtitle="Things that will help along the way." />
        {!adding && (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus /> Add
          </Button>
        )}
      </div>

      {adding && (
        <form
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            let cleanUrl: string | null = null;
            if (url.trim()) {
              try {
                cleanUrl = new URL(/^https?:\/\//.test(url) ? url.trim() : `https://${url.trim()}`).toString();
              } catch {
                cleanUrl = null;
              }
            }
            dispatch({
              type: "resource.add",
              resource: { id: crypto.randomUUID(), title: title.trim(), url: cleanUrl, kind, note: "", order: plan.resources.length },
            });
            setTitle("");
            setUrl("");
            setAdding(false);
          }}
        >
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Resource title" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" aria-label="Resource link" />
          <Select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)} aria-label="Resource type" className="sm:w-36">
            {Object.keys(KIND_ICON).map((k) => (
              <option key={k} value={k}>
                {k[0].toUpperCase() + k.slice(1)}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={!title.trim()}>Add</Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {plan.resources.length === 0 && !adding ? (
        <p className="text-sm text-fg-muted">No resources yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {plan.resources.map((r) => {
            const Icon = KIND_ICON[r.kind];
            return (
              <li key={r.id} className="group flex items-start gap-3 px-4 py-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                <div className="min-w-0 flex-1">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-fg hover:underline">
                      {r.title}
                      <ExternalLink className="size-3 text-fg-subtle" aria-hidden />
                    </a>
                  ) : (
                    <p className="text-[14px] font-medium">{r.title}</p>
                  )}
                  {r.note && <p className="mt-0.5 text-[13px] text-fg-muted">{r.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
                  aria-label={`Remove ${r.title}`}
                  onClick={() => dispatch({ type: "resource.delete", resourceId: r.id })}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Notes ------------------------------------------------------------------- */

export function NotesView() {
  const { plan, dispatch } = usePlanStore();
  const [value, setValue] = useState(plan.notes);
  const [state, setState] = useState<"saved" | "editing">("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef(value);

  useEffect(
    () => () => {
      // Flush pending edits when leaving the view.
      if (timer.current) {
        window.clearTimeout(timer.current);
        dispatch({ type: "plan.update", patch: { notes: latest.current } });
      }
    },
    [dispatch],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <ViewTitle title="Notes" subtitle="A scratchpad for everything around this plan." />
        <span className="text-xs text-fg-subtle" aria-live="polite">
          {state === "editing" ? "Saving…" : `Saved · ${formatShort(plan.updatedAt.slice(0, 10))}`}
        </span>
      </div>
      <Textarea
        value={value}
        aria-label="Plan notes"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          latest.current = v;
          setState("editing");
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            timer.current = null;
            dispatch({ type: "plan.update", patch: { notes: v } });
            setState("saved");
          }, 700);
        }}
        placeholder="Write anything — ideas, decisions, links, reflections."
        className="min-h-[60vh] rounded-2xl p-5 text-[15px] leading-relaxed"
      />
    </div>
  );
}
