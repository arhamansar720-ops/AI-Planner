"use client";

import { useState } from "react";
import { engineSummary, LocalModelDetails } from "@/components/home/local-model-chip";
import { Button } from "@/components/ui/button";
import { PressTile } from "@/components/ui/press-tile";
import { useToast } from "@/components/ui/toast";
import { removeCachedModel, setModelChoice, useActiveModel, useEngineState } from "@/lib/ai/local/engine";
import { getTier, MODEL_TIERS, type ModelChoice } from "@/lib/ai/local/models";
import { LOCAL_MODEL } from "@/lib/config";

/** Settings for the on-device model: which size, its status, download and removal. */
export function LocalModelSettings() {
  const state = useEngineState();
  const model = useActiveModel();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const downloaded = state.status === "ready" || (state.status === "idle" && state.cached);
  const recommended = getTier(model.recommended.tier);

  const choose = (choice: ModelChoice) => {
    if (state.status === "loading") {
      toast({ message: "Wait for the current model to finish loading, then switch." });
      return;
    }
    void setModelChoice(choice);
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] text-fg">Model</p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Using {model.name}
            {model.auto && " (chosen for this device)"} · {engineSummary(state).label}
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

      {LOCAL_MODEL.overrideId ? (
        <p className="text-xs text-fg-subtle">This site uses one model for everyone ({LOCAL_MODEL.overrideId}).</p>
      ) : (
        <div role="radiogroup" aria-label="Model size" className="grid gap-3 sm:grid-cols-2">
          <PressTile
            size="md"
            emoji="✨"
            label="Auto"
            hint={`Picks ${recommended.label.toLowerCase()} (${recommended.name}) for this device`}
            selected={model.choice === "auto"}
            onClick={() => choose("auto")}
          />
          {MODEL_TIERS.map((t) => (
            <PressTile
              key={t.id}
              size="md"
              emoji={t.emoji}
              label={`${t.label} · ${t.name}`}
              hint={`${t.download}. ${t.blurb}`}
              selected={model.choice === t.id}
              onClick={() => choose(t.id)}
            />
          ))}
        </div>
      )}
      {!downloaded && <LocalModelDetails state={state} settingsLink={false} />}
    </div>
  );
}
