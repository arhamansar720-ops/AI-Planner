"use client";

import { Copy, GitBranch, Plus, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlanStore } from "@/components/planner/plan-store";
import { Button } from "@/components/ui/button";
import { Segmented, TaskCheck } from "@/components/ui/controls";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Dialog, Popover, PopoverContent, PopoverTrigger, SheetContent } from "@/components/ui/overlays";
import { diffDays, formatMinutes } from "@/lib/planning/dates";
import type { TaskPatch } from "@/lib/validation/mutations";
import type { Task } from "@/types/plan";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 960, 1200];

export function TaskSheet() {
  const { plan, openTaskId, openTask } = usePlanStore();
  const task = plan.tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <Dialog open={Boolean(task)} onOpenChange={(o) => !o && openTask(null)}>
      {task && (
        <SheetContent side="right" title={task.title} aria-describedby={undefined}>
          <TaskEditor key={task.id} task={task} />
        </SheetContent>
      )}
    </Dialog>
  );
}

function TaskEditor({ task }: { task: Task }) {
  const { plan, dispatch, openTask, askAssistant } = usePlanStore();
  const update = (patch: TaskPatch) => dispatch({ type: "task.update", taskId: task.id, patch });
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [notes, setNotes] = useState(task.notes);
  const [newStep, setNewStep] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reflect assistant edits
  useEffect(() => setTitle(task.title), [task.title]);

  const durationDays = diffDays(task.dueDate, task.startDate) + 1;
  const deps = task.dependsOn.map((id) => plan.tasks.find((t) => t.id === id)).filter(Boolean) as Task[];
  const durationOptions = DURATIONS.includes(task.estimatedMinutes)
    ? DURATIONS
    : [...DURATIONS, task.estimatedMinutes].sort((a, b) => a - b);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 scrollbar-thin">
        <div className="flex items-start gap-3 pr-8">
          <div className="pt-[9px]">
            <TaskCheck
              checked={task.status === "done"}
              onChange={() => dispatch({ type: "task.toggle", taskId: task.id })}
              label="Mark task done"
            />
          </div>
          <Textarea
            value={title}
            aria-label="Task title"
            rows={1}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
            onBlur={() => title.trim() && title.trim() !== task.title && update({ title: title.trim() })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
            className="min-h-0 border-transparent bg-transparent px-1.5 text-[19px] font-semibold tracking-[-0.015em] shadow-none hover:border-border focus:border-accent-line"
          />
        </div>

        <div className="mt-6 grid grid-cols-[96px_1fr] items-center gap-x-4 gap-y-3.5 text-[13px]">
          <span className="text-fg-subtle">Status</span>
          <Segmented
            label="Status"
            size="sm"
            value={task.status}
            onChange={(status) => update({ status })}
            options={[
              { value: "todo", label: "To do" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ]}
          />
          <span className="text-fg-subtle">Priority</span>
          <Segmented
            label="Priority"
            size="sm"
            value={task.priority}
            onChange={(priority) => update({ priority })}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <Label htmlFor="task-start" className="font-normal text-fg-subtle">Start</Label>
          <Input
            id="task-start"
            type="date"
            value={task.startDate}
            onChange={(e) => e.target.value && update({ startDate: e.target.value })}
            className="h-8 w-44"
          />
          <Label htmlFor="task-due" className="font-normal text-fg-subtle">Due</Label>
          <div className="flex items-center gap-3">
            <Input
              id="task-due"
              type="date"
              value={task.dueDate}
              min={task.startDate}
              onChange={(e) => e.target.value && update({ dueDate: e.target.value })}
              className="h-8 w-44"
            />
            <span className="text-xs text-fg-subtle">
              {durationDays} {durationDays === 1 ? "day" : "days"}
            </span>
          </div>
          <Label htmlFor="task-effort" className="font-normal text-fg-subtle">Effort</Label>
          <Select
            id="task-effort"
            value={task.estimatedMinutes}
            onChange={(e) => update({ estimatedMinutes: Number(e.target.value) })}
            className="w-44 [&_select]:h-8"
          >
            {durationOptions.map((m) => (
              <option key={m} value={m}>
                {formatMinutes(m)}
              </option>
            ))}
          </Select>
          <Label htmlFor="task-phase" className="font-normal text-fg-subtle">Phase</Label>
          <Select
            id="task-phase"
            value={task.phaseId}
            onChange={(e) => update({ phaseId: e.target.value })}
            className="w-full max-w-64 [&_select]:h-8"
          >
            {plan.phases.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i + 1}. {p.title}
              </option>
            ))}
          </Select>
          <span className="self-start pt-1.5 text-fg-subtle">Depends on</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {deps.map((d) => (
              <span key={d.id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface-2 py-0.5 pl-2 pr-0.5 text-xs">
                <GitBranch className="size-3 shrink-0 text-fg-subtle" aria-hidden />
                <span className="truncate">{d.title}</span>
                <button
                  type="button"
                  onClick={() => update({ dependsOn: task.dependsOn.filter((x) => x !== d.id) })}
                  className="rounded p-0.5 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                  aria-label={`Remove dependency on ${d.title}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <DependencyPicker task={task} onAdd={(id) => update({ dependsOn: [...task.dependsOn, id] })} />
          </div>
        </div>

        <div className="mt-7">
          <Label htmlFor="task-description" className="text-fg-muted">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== task.description && update({ description })}
            placeholder="What does done look like?"
            className="mt-1.5 min-h-24"
          />
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-fg-muted">Steps</p>
          <ul className="mt-1.5 flex flex-col">
            {task.subtasks.map((s) => (
              <li key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-surface-2/70">
                <TaskCheck
                  size="sm"
                  checked={s.done}
                  onChange={() => dispatch({ type: "subtask.toggle", taskId: task.id, subtaskId: s.id })}
                  label={`Mark step “${s.title}” ${s.done ? "not done" : "done"}`}
                />
                <span className={`flex-1 text-[13.5px] ${s.done ? "text-fg-subtle line-through" : ""}`}>{s.title}</span>
                <button
                  type="button"
                  onClick={() => update({ subtasks: task.subtasks.filter((x) => x.id !== s.id) })}
                  className="rounded p-1 text-fg-subtle opacity-0 hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Remove step ${s.title}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-1 flex items-center gap-2 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              const t = newStep.trim();
              if (!t) return;
              update({ subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: t, done: false }] });
              setNewStep("");
            }}
          >
            <Plus className="size-3.5 text-fg-subtle" aria-hidden />
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              placeholder="Add a step"
              aria-label="Add a step"
              className="h-8 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-fg-subtle"
            />
          </form>
        </div>

        <div className="mt-6">
          <Label htmlFor="task-notes" className="text-fg-muted">Notes</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== task.notes && update({ notes })}
            placeholder="Anything worth remembering"
            className="mt-1.5 min-h-24"
          />
        </div>
      </div>

      <footer className="flex items-center gap-1 border-t border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => { openTask(null); askAssistant(`For the task “${task.title}”: `); }}>
          <Wand2 /> Ask AI
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const id = crypto.randomUUID();
            dispatch({ type: "task.duplicate", taskId: task.id, newId: id });
            openTask(id);
          }}
        >
          <Copy /> Duplicate
        </Button>
        <Button
          variant="danger-ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            openTask(null);
            dispatch({ type: "task.delete", taskId: task.id });
          }}
        >
          <Trash2 /> Delete
        </Button>
      </footer>
    </div>
  );
}

function DependencyPicker({ task, onAdd }: { task: Task; onAdd: (id: string) => void }) {
  const { plan } = usePlanStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Prevent cycles: a task can't depend on anything that (transitively) depends on it.
  const dependents = new Set<string>([task.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of plan.tasks) {
      if (!dependents.has(t.id) && t.dependsOn.some((d) => dependents.has(d))) {
        dependents.add(t.id);
        grew = true;
      }
    }
  }
  const options = plan.tasks.filter(
    (t) =>
      !dependents.has(t.id) &&
      !task.dependsOn.includes(t.id) &&
      t.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="text-fg-subtle">
          <Plus /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks"
          className="h-8"
          aria-label="Search tasks"
        />
        <ul className="mt-1 max-h-60 overflow-y-auto scrollbar-thin">
          {options.slice(0, 50).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(t.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2"
              >
                {t.title}
              </button>
            </li>
          ))}
          {options.length === 0 && <li className="px-2.5 py-2 text-xs text-fg-subtle">No matching tasks</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
