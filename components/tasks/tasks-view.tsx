"use client";

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlanStore } from "@/components/planner/plan-store";
import { Segmented } from "@/components/ui/controls";
import { createBlankTask } from "@/lib/planning/mutations";
import type { Task } from "@/types/plan";
import { TaskRow } from "./task-row";

type Filter = "open" | "all" | "done";

export function TasksView() {
  const { plan } = usePlanStore();
  const [filter, setFilter] = useState<Filter>("open");
  const counts = {
    open: plan.tasks.filter((t) => t.status !== "done").length,
    done: plan.tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Tasks</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {counts.open} open · {counts.done} done. Drag to reorder within a phase.
          </p>
        </div>
        <Segmented
          label="Filter tasks"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open" },
            { value: "all", label: "All" },
            { value: "done", label: "Done" },
          ]}
        />
      </div>
      {plan.phases.map((phase, i) => (
        <PhaseTasks
          key={phase.id}
          phaseId={phase.id}
          title={`${i + 1}. ${phase.title}`}
          filter={filter}
          tasks={plan.tasks.filter((t) => t.phaseId === phase.id)}
        />
      ))}
    </div>
  );
}

function PhaseTasks({ phaseId, title, tasks, filter }: { phaseId: string; title: string; tasks: Task[]; filter: Filter }) {
  const { plan, dispatch } = usePlanStore();
  const [order, setOrder] = useState(tasks.map((t) => t.id));
  const [adding, setAdding] = useState("");
  const key = tasks.map((t) => t.id).join();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resync after external changes
  useEffect(() => setOrder(tasks.map((t) => t.id)), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visible = order
    .map((id) => byId.get(id))
    .filter((t): t is Task => Boolean(t))
    .filter((t) => (filter === "all" ? true : filter === "done" ? t.status === "done" : t.status !== "done"));
  const canReorder = filter === "all";

  if (filter === "done" && visible.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-1.5 border-b border-border pb-2 text-[13px] font-medium text-fg-muted">{title}</h2>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="-mx-3 flex flex-col"
        as="div"
      >
        {visible.map((t) => (
          <DraggableTask
            key={t.id}
            task={t}
            enabled={canReorder}
            onDrop={() => dispatch({ type: "task.reorder", phaseId, orderedIds: order })}
          />
        ))}
      </Reorder.Group>
      {visible.length === 0 && <p className="px-0 py-2 text-[13px] text-fg-subtle">Everything here is done.</p>}
      {filter !== "done" && (
        <form
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-1 focus-within:bg-surface-2/70"
          onSubmit={(e) => {
            e.preventDefault();
            const v = adding.trim();
            if (!v) return;
            dispatch({ type: "task.add", task: createBlankTask(plan, phaseId, crypto.randomUUID(), v.slice(0, 300)) });
            setAdding("");
          }}
        >
          <Plus className="size-3.5 text-fg-subtle" aria-hidden />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            placeholder="Add a task"
            aria-label={`Add a task to ${title}`}
            className="h-8 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-fg-subtle"
          />
        </form>
      )}
    </section>
  );
}

function DraggableTask({ task, enabled, onDrop }: { task: Task; enabled: boolean; onDrop: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={task.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="relative rounded-xl bg-bg data-[dragging]:shadow-md"
      whileDrag={{ scale: 1.01, boxShadow: "var(--shadow-md)", zIndex: 20 }}
    >
      <TaskRow
        task={task}
        dragHandle={
          enabled ? (
            <button
              type="button"
              onPointerDown={(e) => controls.start(e)}
              className="relative z-10 -ml-2 mt-0.5 cursor-grab touch-none rounded p-0.5 text-fg-subtle opacity-0 transition-opacity hover:text-fg active:cursor-grabbing group-hover:opacity-100 max-md:opacity-60"
              aria-label={`Reorder ${task.title}`}
            >
              <GripVertical className="size-3.5" />
            </button>
          ) : null
        }
      />
    </Reorder.Item>
  );
}
