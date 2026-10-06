"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";
import { Tooltip } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { useDictation, useDictationSupported } from "@/lib/voice/dictation";
import { stopSpeaking } from "@/lib/voice/speech";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

const ERRORS = {
  denied: "Microphone access is blocked. Allow it in your browser’s site settings to dictate.",
  "no-speech": "Didn’t catch that. Tap the mic and try again.",
  failed: "Dictation isn’t available right now.",
} as const;

/** Speak into a text field: what you say is appended live to `value`. */
export function DictationButton({
  value,
  onChange,
  className,
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const supported = useDictationSupported();
  const base = useRef("");
  const toast = useToast();
  const { listening, error, start, stop } = useDictation((text) => onChange(base.current + text));

  useEffect(() => {
    if (error) toast({ message: ERRORS[error], tone: error === "no-speech" ? undefined : "error" });
  }, [error, toast]);

  if (!supported) return null;

  const toggle = () => {
    if (listening) return stop();
    stopSpeaking();
    const trimmed = value.trimEnd();
    base.current = trimmed ? `${trimmed} ` : "";
    void start();
  };

  return (
    <Tooltip content={listening ? "Stop dictation" : "Dictate"} side="top">
      <motion.button
        type="button"
        onClick={toggle}
        aria-label={listening ? "Stop dictation" : "Dictate"}
        aria-pressed={listening}
        whileTap={{ scale: 0.9 }}
        transition={spring.press}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200",
          size === "sm" ? "size-8" : "size-9",
          listening ? "bg-accent text-accent-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
          className,
        )}
      >
        {listening && <span className="ring-out absolute inset-0 rounded-full bg-accent" aria-hidden />}
        <AnimatePresence mode="wait" initial={false}>
          {listening ? (
            <motion.span
              key="bars"
              className="relative flex h-3.5 items-center gap-[3px]"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              aria-hidden
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className="voice-bar h-full w-[3px] rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </motion.span>
          ) : (
            <motion.span key="mic" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              <Mic className={size === "sm" ? "size-4" : "size-[18px]"} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </Tooltip>
  );
}
