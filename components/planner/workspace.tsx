"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Flag,
  GanttChart,
  LayoutList,
  ListChecks,
  Menu as MenuIcon,
  NotebookPen,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { CalendarView } from "@/components/calendar/calendar-view";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { TasksView } from "@/components/tasks/tasks-view";
import { TimelineView } from "@/components/timeline/timeline-view";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { ease, spring } from "@/lib/motion";
import { formatMinutes, weekdayNames } from "@/lib/planning/dates";
import { progress } from "@/lib/planning/selectors";
import { cn } from "@/lib/utils/cn";
import type { Plan } from "@/types/plan";
import { OverviewView } from "./overview-view";
import { PlanStoreProvider, usePlanStore, type WorkspaceView } from "./plan-store";
import { MilestonesView, NotesView, ResourcesView } from "./secondary-views";

const VIEWS: { id: WorkspaceView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutList },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "milestones", label: "Milestones", icon: Flag },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "notes", label: "Notes", icon: NotebookPen },
];

const WIDE: WorkspaceView[] = ["timeline", "calendar"];

export function Workspace({
  plan,
  initialView,
  handoff = false,
}: {
  plan: Plan;
  initialView?: WorkspaceView;
  /** True when arriving straight from generation: elements fly in from the canvas. */
  handoff?: boolean;
}) {
  return (
    <PlanStoreProvider initialPlan={plan} initialView={initialView}>
      <WorkspaceLayout handoff={handoff} />
      <TaskSheet />
    </PlanStoreProvider>
  );
}

function WorkspaceLayout({ handoff: initialHandoff }: { handoff: boolean }) {
  const { view, setView, assistantOpen, setAssistantOpen } = usePlanStore();
  const [navOpen, setNavOpen] = useState(false);
  const [handoff, setHandoff] = useState(initialHandoff);
  const [wideAssistant, setWideAssistant] = useState(false);

  // Shared-layout ids are only needed for the arrival animation.
  useEffect(() => {
    if (!handoff) return;
    const t = window.setTimeout(() => setHandoff(false), 1800);
    return () => window.clearTimeout(t);
  }, [handoff]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setWideAssistant(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const enterFrom = (x: number) =>
    initialHandoff
      ? { initial: { opacity: 0, x }, animate: { opacity: 1, x: 0 }, transition: { ...spring.soft, delay: 0.25 } }
      : {};

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 border-t border-border">
      <motion.aside
        {...enterFrom(-16)}
        className="hidden w-[232px] shrink-0 flex-col border-r border-border md:flex"
        aria-label="Plan sections"
      >
        <SidebarNav onNavigate={() => {}} />
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open plan sections" onClick={() => setNavOpen(true)}>
            <MenuIcon />
          </Button>
          <span className="text-[13px] font-medium">{VIEWS.find((v) => v.id === view)?.label}</span>
        </div>

        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {initialHandoff && (
            <motion.div
              layoutId="plan-surface"
              aria-hidden
              className="glass pointer-events-none absolute inset-x-3 top-3 z-10 h-[calc(100%-24px)] sm:inset-x-6"
              style={{ borderRadius: 28 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ ...spring.travel, opacity: { delay: 0.35, duration: 0.55, ease: ease.out } }}
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.3, ease: ease.out }}
              className={cn(
                "mx-auto w-full px-5 pb-28 pt-8 sm:px-8 sm:pt-10",
                WIDE.includes(view) ? "max-w-[1180px]" : "max-w-[780px]",
              )}
            >
              {view === "overview" && <OverviewView handoff={handoff} />}
              {view === "timeline" && <TimelineView />}
              {view === "tasks" && <TasksView />}
              {view === "calendar" && <CalendarView />}
              {view === "milestones" && <MilestonesView />}
              {view === "resources" && <ResourcesView />}
              {view === "notes" && <NotesView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {wideAssistant ? (
        <motion.aside
          {...enterFrom(16)}
          className="flex w-[360px] shrink-0 flex-col border-l border-border bg-bg-tint/40"
          aria-label="Assistant"
        >
          <AssistantPanel />
        </motion.aside>
      ) : (
        <>
          <motion.div
            className="fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.4 }}
          >
            <Button variant="primary" className="h-10 rounded-full px-4 shadow-lg sm:h-11 sm:px-5" onClick={() => setAssistantOpen(true)}>
              <Wand2 /> Ask AI
            </Button>
          </motion.div>
          <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
            <SheetContent side="right" title="Assistant" aria-describedby={undefined} className="max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[85dvh] max-sm:w-full max-sm:rounded-b-none">
              <AssistantPanel />
            </SheetContent>
          </Dialog>
        </>
      )}

      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" title="Plan sections" aria-describedby={undefined}>
          <SidebarNav
            onNavigate={(v) => {
              setView(v);
              setNavOpen(false);
            }}
          />
        </SheetContent>
      </Dialog>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: (v: WorkspaceView) => void }) {
  const { plan, view, setView } = usePlanStore();
  const { done, total, ratio } = progress(plan);
  const open = total - done;
  const counts: Partial<Record<WorkspaceView, number>> = {
    tasks: open,
    milestones: plan.milestones.filter((m) => !m.reached).length,
    resources: plan.resources.length,
  };
  const workDays = weekdayNames.short.filter((_, d) => !plan.constraints.blockedWeekdays.includes(d));

  return (
    <div className="flex h-full flex-col px-3 pb-4 pt-5">
      <p className="truncate px-2.5 text-[13px] font-medium text-fg" title={plan.title}>
        {plan.title}
      </p>
      <div className="mt-2 flex items-center gap-2 px-2.5">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div className="h-full origin-left rounded-full bg-accent" initial={false} animate={{ scaleX: ratio }} transition={spring.soft} />
        </div>
        <span className="text-[11px] tabular-nums text-fg-subtle">{Math.round(ratio * 100)}%</span>
      </div>

      <nav className="mt-6 flex flex-col gap-0.5">
        {VIEWS.map((v) => {
          const active = v.id === view;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setView(v.id);
                onNavigate(v.id);
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                active ? "text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {active && (
                <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-lg bg-surface-2" transition={spring.snap} />
              )}
              <Icon className="relative size-4 opacity-80" />
              <span className="relative">{v.label}</span>
              {counts[v.id] ? (
                <span className="relative ml-auto text-[11px] tabular-nums text-fg-subtle">{counts[v.id]}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => {
          setView("calendar");
          onNavigate("calendar");
        }}
        className="mt-auto rounded-lg px-2.5 py-2 text-left text-xs leading-relaxed text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg-muted"
      >
        {formatMinutes(plan.constraints.dailyMinutes)} a day ·{" "}
        {workDays.length === 7 ? "Every day" : workDays.length === 5 && !workDays.includes("Sat") && !workDays.includes("Sun") ? "Weekdays" : workDays.join(" ")}
      </button>
    </div>
  );
}
