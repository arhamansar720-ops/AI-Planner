"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Flag, Plus } from "lucide-react";
import { TaskRow } from "@/components/tasks/task-row";
import { TimelineStrip } from "@/components/timeline/timeline-strip";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";
import { formatMinutes, formatRange, formatShort, localToday } from "@/lib/planning/dates";
import { createBlankTask } from "@/lib/planning/mutations";
import { focusForToday, weekLabel } from "@/lib/planning/selectors";
import { cn } from "@/lib/utils/cn";
import { PlanHeader } from "./plan-header";
import { usePlanStore } from "./plan-store";

export function OverviewView({ handoff }: { handoff: boolean }) {
  const { plan, dispatch, setView, openTask } = usePlanStore();
  const today = localToday();
  const focus = focusForToday(plan, today);
  const todaysMinutes = plan.schedule.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0);
  const anyDone = plan.tasks.some((t) => t.status === "done");

  return (
    <div className="flex flex-col gap-10">
      <PlanHeader handoff={handoff} />

      {/* Today */}
      <Section
        title={plan.status === "completed" ? "All done" : "Focus today"}
        aside={todaysMinutes > 0 ? `${formatMinutes(todaysMinutes)} scheduled` : undefined}
      >
        {plan.status === "completed" ? (
          <p className="text-sm text-fg-muted">Every task in this plan is complete. Nicely done.</p>
        ) : focus.length ? (
          <div className="-mx-3 flex flex-col">
            {focus.map((t) => (
              <TaskRow key={t.id} task={t} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            Nothing is due yet. The next task starts {formatShort(plan.tasks.find((t) => t.status !== "done")?.startDate ?? plan.startDate)}.
          </p>
        )}
        {!anyDone && plan.nextActions.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3.5">
            <p className="text-xs font-medium text-fg-subtle">Here’s how we’ll get started</p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {plan.nextActions.map((a, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-fg">
                  <span className="mt-[1px] text-xs tabular-nums text-fg-subtle">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Section>

      {/* Timeline */}
      <Section
        title="Timeline"
        action={
          <Button variant="ghost" size="xs" onClick={() => setView("timeline")}>
            Open <ArrowRight />
          </Button>
        }
      >
        <TimelineStrip
          layoutId={handoff ? "plan-timeline" : undefined}
          start={plan.startDate}
          end={plan.endDate}
          phases={plan.phases}
          milestones={plan.milestones}
          showToday
          assemble={false}
        />
      </Section>

      {/* Phases */}
      <div className="flex flex-col gap-9">
        {plan.phases.map((phase, i) => {
          const tasks = plan.tasks.filter((t) => t.phaseId === phase.id);
          const doneCount = tasks.filter((t) => t.status === "done").length;
          return (
            <section key={phase.id} aria-labelledby={`phase-${phase.id}-title`}>
              <motion.div
                layoutId={handoff ? `phase-${phase.id}` : undefined}
                transition={spring.travel}
                className="mb-2 flex items-end justify-between gap-4 border-b border-border pb-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium tabular-nums text-accent">
                    Phase {i + 1} · {weekLabel(plan.startDate, phase.startDate, phase.endDate)}
                  </p>
                  <h2 id={`phase-${phase.id}-title`} className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-fg">
                    {phase.title}
                  </h2>
                  {phase.summary && <p className="mt-0.5 text-[13px] text-fg-muted">{phase.summary}</p>}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                  {formatRange(phase.startDate, phase.endDate)} · {doneCount}/{tasks.length}
                </span>
              </motion.div>
              <div className="-mx-3 flex flex-col">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} layoutId={handoff ? `task-${t.id}` : undefined} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const task = createBlankTask(plan, phase.id, crypto.randomUUID());
                  dispatch({ type: "task.add", task });
                  openTask(task.id);
                }}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Plus className="size-3.5" /> Add task
              </button>
            </section>
          );
        })}
      </div>

      {/* Milestones */}
      {plan.milestones.length > 0 && (
        <Section
          title="Milestones"
          action={
            <Button variant="ghost" size="xs" onClick={() => setView("milestones")}>
              All <ArrowRight />
            </Button>
          }
        >
          <ul className="flex flex-col">
            {plan.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-1.5 text-[14px]">
                <Flag className={cn("size-3.5", m.reached ? "text-success" : "text-fg-subtle")} aria-hidden />
                <span className={cn("flex-1", m.reached && "text-fg-subtle line-through")}>{m.title}</span>
                <span className="text-xs tabular-nums text-fg-subtle">{formatShort(m.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Assumptions & risks */}
      {(plan.assumptions.length > 0 || plan.risks.length > 0) && (
        <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-2">
          {plan.assumptions.length > 0 && (
            <Section title="Assumptions">
              <ul className="flex flex-col gap-2">
                {plan.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-fg-muted">
                    <span className="mt-[9px] size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {plan.risks.length > 0 && (
            <Section title="Risks to watch">
              <ul className="flex flex-col gap-3">
                {plan.risks.map((r) => (
                  <li key={r.id} className="text-[13.5px] leading-relaxed">
                    <p className="flex items-center gap-2 font-medium text-fg">
                      <AlertTriangle
                        className={cn("size-3.5", r.likelihood === "high" ? "text-warning" : "text-fg-subtle")}
                        aria-hidden
                      />
                      {r.title}
                    </p>
                    {r.mitigation && <p className="mt-0.5 pl-[22px] text-fg-muted">{r.mitigation}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

export function Section({
  title,
  aside,
  action,
  children,
}: {
  title: string;
  aside?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex h-7 items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-fg-muted">
          {title}
          {aside && <span className="ml-2 font-normal text-fg-subtle">{aside}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
