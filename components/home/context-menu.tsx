"use client";

import { ArrowLeft, CalendarRange, FileText, Layers, Link2, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { getProvider } from "@/lib/connections/providers";
import { readSkywardSnapshot } from "@/lib/connections/skyward";
import type { ContextItemInput } from "@/lib/validation/api";
import type { Plan, PlanSummary } from "@/types/plan";

const MAX_FILE_BYTES = 200_000;
const TEXT_TYPES = /\.(txt|md|markdown|csv|json|ics)$/i;

type Mode = "menu" | "note" | "link" | "plan" | "connections";
type Connection = { id: string; provider: string; host: string };

export function AddContextButton({
  onAdd,
  recentPlans,
  disabled,
}: {
  onAdd: (item: ContextItemInput) => void;
  recentPlans: PlanSummary[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [text, setText] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const close = () => {
    setOpen(false);
    window.setTimeout(() => {
      setMode("menu");
      setText("");
    }, 150);
  };

  const onFile = async (file: File) => {
    if (!TEXT_TYPES.test(file.name) && !file.type.startsWith("text/")) {
      toast({ message: "Text files only for now — .txt, .md, .csv or .json.", tone: "error" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ message: "That file is too large. Try one under 200 KB.", tone: "error" });
      return;
    }
    const content = await file.text();
    onAdd({ kind: "file", label: file.name, content });
    close();
  };

  const attachPlan = async (summary: PlanSummary) => {
    setLoadingPlan(summary.id);
    try {
      const res = await fetch(`/api/plans/${summary.id}`);
      if (!res.ok) throw new Error();
      const { plan } = (await res.json()) as { plan: Plan };
      onAdd({ kind: "plan", label: plan.title, content: describePlan(plan) });
      close();
    } catch {
      toast({ message: "Couldn’t load that plan.", tone: "error" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const openConnections = async () => {
    setMode("connections");
    if (connections) return;
    const res = await fetch("/api/connections").catch(() => null);
    if (res?.status === 401) setSignedOut(true);
    const data = res?.ok ? ((await res.json()) as { connections: Connection[] }) : { connections: [] };
    setConnections(data.connections);
  };

  const attachConnection = async (c: Connection) => {
    setLoadingPlan(c.id);
    try {
      const res = await fetch(`/api/connections/${c.id}`);
      const data = (await res.json()) as { events?: unknown[]; summary?: string; error?: string };
      if (!res.ok || !data.summary) throw new Error(data.error);
      const name = getProvider(c.provider)?.name ?? "Calendar";
      onAdd({ kind: "file", label: `${name} · ${data.events?.length ?? 0} upcoming`, content: data.summary });
      close();
    } catch (error) {
      toast({ message: (error as Error).message || "Couldn’t read that calendar.", tone: "error" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const skyward = mode === "connections" ? readSkywardSnapshot() : null;

  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} className="-ml-1 text-fg-muted">
          <Plus />
          Add context
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        {mode === "menu" && (
          <div role="menu" className="flex flex-col">
            <MenuButton icon={<NotebookPen />} label="Note" hint="Constraints, details, preferences" onClick={() => setMode("note")} />
            <MenuButton icon={<Link2 />} label="Link" hint="A page you want considered" onClick={() => setMode("link")} />
            <MenuButton icon={<FileText />} label="File" hint="Text, Markdown, CSV or JSON" onClick={() => fileRef.current?.click()} />
            <MenuButton
              icon={<CalendarRange />}
              label="Connected tools"
              hint="Deadlines from Schoology, Outlook and more"
              onClick={openConnections}
            />
            <MenuButton
              icon={<Layers />}
              label="Existing plan"
              hint={recentPlans.length ? "Build on something you’ve planned" : "No plans yet"}
              disabled={!recentPlans.length}
              onClick={() => setMode("plan")}
            />
          </div>
        )}
        {(mode === "note" || mode === "link") && (
          <form
            className="flex flex-col gap-2 p-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const value = text.trim();
              if (!value) return;
              if (mode === "link") {
                let url: URL;
                try {
                  url = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`);
                } catch {
                  toast({ message: "That doesn’t look like a link.", tone: "error" });
                  return;
                }
                onAdd({ kind: "link", label: url.hostname.replace(/^www\./, ""), content: url.toString() });
              } else {
                onAdd({ kind: "note", label: value.slice(0, 40), content: value });
              }
              close();
            }}
          >
            <button type="button" onClick={() => setMode("menu")} className="flex items-center gap-1 text-xs text-fg-subtle hover:text-fg">
              <ArrowLeft className="size-3" /> Back
            </button>
            {mode === "note" ? (
              <Textarea
                autoFocus
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. I work weekdays until 5pm and have a $300 budget."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                }}
              />
            ) : (
              <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="https://" inputMode="url" />
            )}
            <Button type="submit" size="sm" variant="primary" disabled={!text.trim()}>
              Add {mode}
            </Button>
          </form>
        )}
        {mode === "plan" && (
          <div className="flex flex-col p-0.5">
            <button type="button" onClick={() => setMode("menu")} className="mb-1 flex items-center gap-1 px-2 pt-1 text-xs text-fg-subtle hover:text-fg">
              <ArrowLeft className="size-3" /> Back
            </button>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {recentPlans.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={loadingPlan !== null}
                  onClick={() => attachPlan(p)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="truncate">{p.title}</span>
                  {loadingPlan === p.id && <span className="text-xs text-fg-subtle">Adding…</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === "connections" && (
          <div className="flex flex-col p-0.5">
            <button type="button" onClick={() => setMode("menu")} className="mb-1 flex items-center gap-1 px-2 pt-1 text-xs text-fg-subtle hover:text-fg">
              <ArrowLeft className="size-3" /> Back
            </button>
            {connections === null ? (
              <p className="px-2.5 py-3 text-[13px] text-fg-subtle">Loading…</p>
            ) : (
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {connections.map((c) => {
                  const p = getProvider(c.provider);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={loadingPlan !== null}
                      onClick={() => attachConnection(c)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-surface-2 disabled:opacity-50"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: p?.color }}>
                        {p?.name[0]}
                      </span>
                      <span className="flex-1 truncate">{p?.name ?? c.provider}</span>
                      {loadingPlan === c.id && <span className="text-xs text-fg-subtle">Reading…</span>}
                    </button>
                  );
                })}
                {skyward && (
                  <button
                    type="button"
                    onClick={() => {
                      onAdd({ kind: "file", label: "Skyward assignments", content: `Pasted from Skyward Family Access (assignments, due dates and grades):\n${skyward.text}` });
                      close();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-surface-2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: getProvider("skyward")?.color }}>
                      S
                    </span>
                    <span className="flex-1 truncate">Skyward</span>
                  </button>
                )}
                {connections.length === 0 && !skyward && (
                  <p className="px-2.5 py-2 text-[13px] leading-relaxed text-fg-muted">
                    {signedOut ? "Sign in to connect your tools." : "Nothing connected yet."}{" "}
                    <Link href={signedOut ? "/login" : "/personalize#connections"} className="font-medium text-fg underline underline-offset-2">
                      {signedOut ? "Sign in" : "Connect a tool"}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,.csv,.json,.ics,text/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function MenuButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 disabled:opacity-40 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:text-fg-muted"
    >
      {icon}
      <span className="flex flex-col">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="text-xs text-fg-subtle">{hint}</span>
      </span>
    </button>
  );
}

function describePlan(plan: Plan): string {
  const lines = [`Plan: ${plan.title} (${plan.startDate} → ${plan.endDate})`, plan.description];
  for (const phase of plan.phases) {
    lines.push(`\n${phase.title}`);
    for (const t of plan.tasks.filter((x) => x.phaseId === phase.id)) {
      lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title} (due ${t.dueDate})`);
    }
  }
  return lines.join("\n").slice(0, 20_000);
}
