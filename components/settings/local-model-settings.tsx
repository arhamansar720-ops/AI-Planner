"use client";

import { useState } from "react";
import { engineSummary, LocalModelDetails } from "@/components/home/local-model-chip";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeCachedModel, useEngineState } from "@/lib/ai/local/engine";
import { LOCAL_MODEL } from "@/lib/config";

/** Settings row for the on-device model: status, download, and removal. */
export function LocalModelSettings() {
  const state = useEngineState();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const downloaded = state.status === "ready" || (state.status === "idle" && state.cached);

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] text-fg">Model</p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {LOCAL_MODEL.label} · {engineSummary(state).label}
          </p>
        </div>
        {downloaded && (
          <Button
            variant="danger-ghost"
            size="sm"
            loading={removing}
            onClick={async () => {
              setRemoving(true);
              try {
                await removeCachedModel();
                toast({ message: "Model removed from this device" });
              } catch {
                toast({ message: "Couldn’t remove the model.", tone: "error" });
              } finally {
                setRemoving(false);
              }
            }}
          >
            Remove from this device
          </Button>
        )}
      </div>
      {!downloaded && <LocalModelDetails state={state} />}
    </div>
  );
}
