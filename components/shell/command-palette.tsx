"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck,
  CornerDownLeft,
  FileText,
  History,
  MessagesSquare,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocus } from "@/components/focus/focus";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "./theme";
import { NEW_PLAN_EVENT } from "./top-nav";

export const OPEN_COMMANDS_EVENT = "forma:commands";

type Command = {
  id: string;
  group: "Go to" | "Focus" | "Theme" | "Plans";
  label: string;
  hint?: string;
  keywords?: string;
  icon: typeof Search;
  run: () => void;
};

type PlanSummary = { id: string; title: string; status: string; taskCount: number; doneCount: number };

/** Every query word must appear somewhere in the label or keywords. */
export function matchesQuery(text: string, query: string) {
  const hay = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/**
 * ⌘K / Ctrl+K: jump anywhere, open any plan, start a focus timer or switch
 * theme without leaving the keyboard.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const router = useRouter();
  const focus = useFocus();
  const { setTheme } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
    void fetch("/api/plans", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { plans: [] }))
      .then((d: { plans?: PlanSummary[] }) => setPlans(d.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMANDS_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMANDS_EVENT, show);
    };
  }, [open, show]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const base: Command[] = [
      { id: "today", group: "Go to", label: "Today", hint: "Your sessions and deadlines", icon: CalendarCheck, run: go("/today") },
      {
        id: "new",
        group: "Go to",
        label: "New plan",
        keywords: "create goal start",
        icon: Plus,
        run: () => {
          window.dispatchEvent(new Event(NEW_PLAN_EVENT));
          router.push("/app");
        },
      },
      { id: "insights", group: "Go to", label: "Insights", hint: "Streaks, focus and progress", keywords: "stats progress chart", icon: BarChart3, run: go("/insights") },
      { id: "chats", group: "Go to", label: "Chats", keywords: "assistant conversations", icon: MessagesSquare, run: go("/chats") },
      { id: "history", group: "Go to", label: "All plans", keywords: "history plans", icon: History, run: go("/history") },
      { id: "personalize", group: "Go to", label: "Personalize", keywords: "voice connections accessibility colors schoology tweek", icon: Sparkles, run: go("/personalize") },
      { id: "settings", group: "Go to", label: "Settings", keywords: "account export password model", icon: Settings, run: go("/settings") },
      ...[25, 15, 50].map<Command>((m) => ({
        id: `focus-${m}`,
        group: "Focus",
        label: `Start a ${m}-minute focus`,
        keywords: "timer pomodoro",
        icon: Timer,
        run: () => focus.start(null, m),
      })),
      { id: "light", group: "Theme", label: "Light theme", keywords: "appearance", icon: Sun, run: () => setTheme("light") },
      { id: "dark", group: "Theme", label: "Dark theme", keywords: "appearance night", icon: Moon, run: () => setTheme("dark") },
      { id: "system", group: "Theme", label: "Match system theme", keywords: "appearance auto", icon: Monitor, run: () => setTheme("system") },
    ];
    const planCommands: Command[] = (plans ?? []).map((p) => ({
      id: `plan-${p.id}`,
      group: "Plans",
      label: p.title,
      hint: `${p.doneCount}/${p.taskCount} tasks${p.status !== "active" ? ` · ${p.status}` : ""}`,
      keywords: "plan",
      icon: FileText,
      run: go(`/plan/${p.id}`),
    }));
    return [...base, ...planCommands];
  }, [plans, router, focus, setTheme]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return commands.filter((c) => c.group !== "Theme").slice(0, 14);
    return commands.filter((c) => matchesQuery(`${c.label} ${c.keywords ?? ""} ${c.group}`, q)).slice(0, 30);
  }, [commands, query]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  // Keep the highlighted row in view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="anim-palette top-[14vh] w-[min(600px,calc(100vw-24px))] translate-y-0 overflow-hidden p-0" aria-describedby="cmd-desc">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <DialogDescription id="cmd-desc" className="sr-only">
          Search for a page, a plan or an action. Use the arrow keys and Enter.
        </DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(results[active]);
              }
            }}
            placeholder="Search plans, pages and actions…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
            aria-label="Search commands"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[10.5px] text-fg-subtle sm:block">esc</kbd>
        </div>
        <div ref={listRef} id="cmd-list" role="listbox" aria-label="Results" className="max-h-[min(420px,55vh)] overflow-y-auto p-2 scrollbar-thin">
          {results.length === 0 && <p className="px-3 py-8 text-center text-[13.5px] text-fg-subtle">Nothing matches “{query}”.</p>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <div key={c.id}>
                {header && <p className="px-3 pb-1 pt-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">{header}</p>}
                <div
                  id={`cmd-${c.id}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className="relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px]"
                >
                  {i === active && (
                    <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                  )}
                  <Icon className={cn("relative size-4 shrink-0", i === active ? "text-accent" : "text-fg-subtle")} aria-hidden />
                  <span className="relative min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="relative hidden shrink-0 text-[12px] text-fg-subtle sm:block">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="relative size-3.5 shrink-0 text-fg-subtle" aria-hidden />}
                </div>
              </div>
            );
          })}
          {plans === null && <p className="px-3 py-2 text-[12px] text-fg-subtle">Loading plans…</p>}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11.5px] text-fg-subtle">
          <span>
            <kbd className="font-mono">↑↓</kbd> to move
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> to open
          </span>
          <span className="ml-auto">
            <kbd className="font-mono">⌘K</kbd> anywhere
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
