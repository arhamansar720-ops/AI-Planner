"use client";

import { motion } from "framer-motion";
import { Copy, GitBranch, MoreHorizontal, Trash2, Wand2 } from "lucide-react";
import { usePlanStore } from "@/components/planner/plan-store";
import { TaskCheck } from "@/components/ui/controls";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlays";
import { spring } from "@/lib/motion";
import { formatMinutes, formatShort, localToday } from "@/lib/planning/dates";
import { isBlocked, isOverdue } from "@/lib/planning/selectors";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/types/plan";

const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export function TaskRow({
  task,
  layoutId,
  dragHandle,
  compact,
}: {
  task: Task;
  layoutId?: string;
  dragHandle?: React.ReactNode;
  compact?: boolean;
}) {
  const { plan, dispatch, openTask, askAssistant } = usePlanStore();
  const today = localToday();
  const done = task.status === "done";
  const blockedBy = isBlocked(task, plan);
  const overdue = isOverdue(task, today);
  const subDone = task.subtasks.filter((s) => s.done).length;

  return (
    <motion.div
      layoutId={layoutId}
      layout={layoutId ? true : "position"}
      transition={spring.travel}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-surface-2/70",
        compact && "py-2",
      )}
    >
      {dragHandle}
      <div className="relative z-10 pt-[1px]">
        <TaskCheck
          checked={done}
          onChange={() => dispatch({ type: "task.toggle", taskId: task.id })}
          label={`Mark “${task.title}” ${done ? "not done" : "done"}`}
        />
      </div>
      <button
        type="button"
        onClick={() => openTask(task.id)}
        className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
      >
        <span
          className={cn(
            "block text-[14px] leading-snug transition-colors duration-200",
            done ? "text-fg-subtle line-through decoration-fg-subtle/50" : "text-fg",
          )}
        >
          {task.title}
        </span>
        {!compact && task.description && !done && (
          <span className="mt-0.5 line-clamp-1 block text-[13px] text-fg-muted">{task.description}</span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums text-fg-subtle">
          <span className={cn(overdue && "font-medium text-danger")}>
            {overdue ? "Overdue · " : "Due "}
            {formatShort(task.dueDate)}
          </span>
          <span aria-hidden>·</span>
          <span>{formatMinutes(task.estimatedMinutes)}</span>
          {task.priority === "high" && !done && (
            <span className="inline-flex items-center gap-1 text-accent">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span>
              {subDone}/{task.subtasks.length} steps
            </span>
          )}
          {blockedBy.length > 0 && (
            <span className="inline-flex items-center gap-1" title={`Waiting on ${blockedBy.map((t) => t.title).join(", ")}`}>
              <GitBranch className="size-3" aria-hidden />
              Waiting on {blockedBy.length === 1 ? `“${truncate(blockedBy[0].title, 28)}”` : `${blockedBy.length} tasks`}
            </span>
          )}
        </span>
      </button>
      <Menu>
        <MenuTrigger
          className="relative z-10 -mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-subtle opacity-0 outline-none transition-[opacity,background-color] hover:bg-surface-3 hover:text-fg focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
          aria-label={`Actions for ${task.title}`}
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => askAssistant(`For the task “${task.title}”: `)}>
            <Wand2 /> Ask AI to modify
          </MenuItem>
          <MenuItem onSelect={() => dispatch({ type: "task.duplicate", taskId: task.id, newId: crypto.randomUUID() })}>
            <Copy /> Duplicate
          </MenuItem>
          <MenuSeparator />
          <MenuItem tone="danger" onSelect={() => dispatch({ type: "task.delete", taskId: task.id })}>
            <Trash2 /> Delete
          </MenuItem>
        </MenuContent>
      </Menu>
    </motion.div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
