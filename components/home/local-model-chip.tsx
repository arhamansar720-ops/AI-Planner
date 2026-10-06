"use client";

import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import Link from "next/link";
import { loadEngine, useActiveModel, useEngineState, type EngineState } from "@/lib/ai/local/engine";
import { cn } from "@/lib/utils/cn";

export function engineSummary(state: EngineState): { label: string; tone: "ok" | "muted" | "busy" | "warn" } {
  switch (state.status) {
    case "checking":
      return { label: "Checking device…", tone: "muted" };
    case "unsupported":
      return { label: "Not supported here", tone: "warn" };
    case "idle":
      return state.cached ? { label: "On device", tone: "ok" } : { label: "Not downloaded", tone: "muted" };
    case "loading":
      return { label: `${state.cached ? "Loading" : "Downloading"} ${Math.round(state.progress * 100)}%`, tone: "busy" };
    case "ready":
      return { label: "Ready", tone: "ok" };
    case "error":
      return { label: "Couldn’t start", tone: "warn" };
  }
}

const DOT = { ok: "bg-success", muted: "bg-fg-subtle", busy: "bg-accent pulse-dot", warn: "bg-warning" } as const;

/** What the on-device model is doing, and the one action that matters. */
export function LocalModelDetails({ state, settingsLink = true }: { state: EngineState; settingsLink?: boolean }) {
  const model = useActiveModel();
  return (
    <div className="flex flex-col gap-2 text-[13px] leading-relaxed">
      <p className="flex items-baseline justify-between gap-2 font-medium text-fg">
        On-device AI · {model.name}
        {settingsLink && (
          <Link href="/settings#ai" className="text-xs font-normal text-fg-subtle underline-offset-2 hover:text-fg hover:underline">
            Change
          </Link>
        )}
      </p>
      <p className="text-fg-muted">
        Plans are made by an open model running privately in your browser. Nothing you type is sent to an AI service.
      </p>
      {state.status === "unsupported" && <p className="text-warning">{state.reason}</p>}
      {state.status === "error" && <p className="text-warning">{state.message}</p>}
      {state.status === "idle" && !state.cached && (
        <p className="text-fg-muted">
          The first time, it downloads {model.download} (once — later visits start in seconds). It needs Chrome or Edge on a
          computer with a recent graphics chip.
        </p>
      )}
      {state.status === "loading" && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full origin-left rounded-full bg-accent transition-transform duration-500" style={{ transform: `scaleX(${state.progress})` }} />
          </div>
          <p className="truncate text-xs text-fg-subtle">{state.cached ? "Loading from this device…" : "Downloading — you can keep typing."}</p>
        </div>
      )}
      {(state.status === "idle" || state.status === "error") && (
        <Button variant="primary" size="sm" className="mt-1 self-start" onClick={() => void loadEngine().catch(() => {})}>
          {state.status === "error" ? "Try again" : state.cached ? "Load now" : `Download now · ${model.download}`}
        </Button>
      )}
    </div>
  );
}

export function LocalModelChip() {
  const state = useEngineState();
  const { label, tone } = engineSummary(state);
  const model = useActiveModel();
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`On-device model: ${label}`}
      >
        <Cpu className="size-3.5 opacity-70" aria-hidden />
        <span className="hidden sm:inline">{model.name}</span>
        <span className={cn("size-1.5 rounded-full", DOT[tone])} aria-hidden />
        <span className="tabular-nums">{label}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <LocalModelDetails state={state} />
      </PopoverContent>
    </Popover>
  );
}
