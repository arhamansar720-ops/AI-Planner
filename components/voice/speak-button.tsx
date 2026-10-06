"use client";

import { Square, Volume2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { speak, speechSupported, stopSpeaking, useSpeakingId, useVoiceSettings } from "@/lib/voice/speech";
import { cn } from "@/lib/utils/cn";

const noop = () => () => {};

/** Read a piece of text aloud, or stop it. Hidden when voice is off or unsupported. */
export function SpeakButton({ id, text, className }: { id: string; text: string; className?: string }) {
  const supported = useSyncExternalStore(noop, speechSupported, () => false);
  const settings = useVoiceSettings();
  const speaking = useSpeakingId() === id;
  if (!supported || !settings.enabled) return null;

  return (
    <button
      type="button"
      onClick={() => (speaking ? stopSpeaking() : speak(text, { id }))}
      aria-label={speaking ? "Stop reading" : "Read aloud"}
      aria-pressed={speaking}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-colors",
        speaking ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {speaking ? <Square className="size-3 fill-current" /> : <Volume2 className="size-3.5" />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
