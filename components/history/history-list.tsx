"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { spring } from "@/lib/motion";
import { addDays, formatLong, formatSpan, localToday, monthNames, parseDate } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import type { PlanSummary } from "@/types/plan";

function localDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketLabel(date: string, today: string) {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  const d = parseDate(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return `${monthNames.long[d.getUTCMonth()]} ${d.getUTCDate()}${sameYear ? "" : `, ${d.getUTCFullYear()}`}`;
}

const STATUS = {
  active: { label: "In progress", dot: "bg-accent" },
  completed: { label: "Completed", dot: "bg-success" },
  archived: { label: "Archived", dot: "bg-fg-subtle" },
} as const;

export function HistoryList({ plans: initial }: { plans: PlanSummary[] }) {
  const [plans, setPlans] = useState(initial);
  const [confirm, setConfirm] = useState<PlanSummary | null>(null);
  const toast = useToast();
  const today = localToday();

  const groups = useMemo(() => {
    const out: { label: string; items: PlanSummary[] }[] = [];
    for (const p of [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
      const label = bucketLabel(localDate(p.createdAt), today);
      const last = out.at(-1);
      if (last?.label === label) last.items.push(p);
      else out.push({ label, items: [p] });
    }
    return out;
  }, [plans, today]);

  const remove = async (plan: PlanSummary) => {
    setConfirm(null);
    const previous = plans;
    setPlans((ps) => ps.filter((p) => p.id !== plan.id));
    const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setPlans(previous);
      toast({ message: "Couldn’t delete that plan.", tone: "error" });
    }
  };

  if (plans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center py-24 text-center"
      >
        <p className="text-[17px] font-medium tracking-[-0.01em]">No plans yet.</p>
        <p className="mt-1 text-sm text-fg-muted">Start with something you’re trying to accomplish.</p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/">
            Create your first plan <ArrowRight />
          </Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.label} aria-labelledby={`h-${g.label}`}>
            <h2 id={`h-${g.label}`} className="mb-1 px-3 text-xs font-medium text-fg-subtle">
              {g.label}
            </h2>
            <ul className="flex flex-col">
              <AnimatePresence initial={false}>
                {g.items.map((p) => {
                  const status = STATUS[p.status];
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                      transition={spring.snap}
                      className="group relative flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2/70"
                    >
                      <Link
                        href={`/plan/${p.id}`}
                        className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                      >
                        <span className="block truncate text-[15px] font-medium text-fg">{p.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                          <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden />
                          {status.label}
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">
                            {p.doneCount}/{p.taskCount} tasks
                          </span>
                          <span aria-hidden className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{formatSpan(p.startDate, p.endDate)}</span>
                        </span>
                      </Link>
                      <span className="hidden text-xs tabular-nums text-fg-subtle sm:block">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <Menu>
                        <MenuTrigger
                          className="relative z-10 inline-flex size-7 items-center justify-center rounded-md text-fg-subtle opacity-0 outline-none transition-opacity hover:bg-surface-3 hover:text-fg focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 data-[state=open]:opacity-100 max-md:opacity-100"
                          aria-label={`Actions for ${p.title}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </MenuTrigger>
                        <MenuContent align="end">
                          <MenuItem tone="danger" onSelect={() => setConfirm(p)}>
                            <Trash2 /> Delete plan
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogTitle className="text-[15px] font-semibold">Delete this plan?</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-fg-muted">
            “{confirm?.title}” and everything in it will be permanently deleted
            {confirm ? ` — created ${formatLong(localDate(confirm.createdAt))}` : ""}.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={() => confirm && remove(confirm)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
