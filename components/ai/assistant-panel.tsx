"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Check } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlanStore } from "@/components/planner/plan-store";
import { ThinkingDots } from "@/components/ui/spinner";
import { DictationButton } from "@/components/voice/dictation-button";
import { SpeakButton } from "@/components/voice/speak-button";
import { useToast } from "@/components/ui/toast";
import { ease, spring } from "@/lib/motion";
import { localToday } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";
import { Markdown } from "./markdown";
import { runLocalAssistant } from "@/lib/ai/local/assistant";
import { useEngineState } from "@/lib/ai/local/engine";
import type { ResponseStyle } from "@/lib/config";
import { speakIfAutoRead, stopSpeaking } from "@/lib/voice/speech";

type Message = { id: string; role: "user" | "assistant"; content: string; changes: string[] };

const SUGGESTIONS = [
  "What should I do today?",
  "Make this less overwhelming.",
  "I only have 45 minutes per day.",
  "I can’t work Fridays.",
];

export function AssistantPanel({ className, responseStyle = "concise" }: { className?: string; responseStyle?: ResponseStyle }) {
  const { plan, applyBatch, assistantDraft } = usePlanStore();
  const engine = useEngineState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();
  const planId = plan.id;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/plans/${planId}/assistant`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((data: { messages: Message[] }) => {
        if (!cancelled) setMessages(data.messages ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [planId]);

  // Prefill from "Ask AI to modify" elsewhere in the workspace.
  useEffect(() => {
    if (!assistantDraft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external prefill request
    setInput(assistantDraft.text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [assistantDraft]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || pending) return;
      setPending(message);
      setInput("");
      stopSpeaking();
      try {
        const result = await runLocalAssistant({
          plan,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          message,
          today: localToday(),
          responseStyle,
        });
        if (result.mutations.length) applyBatch(result.mutations, { message: result.changes[0] ?? "Plan updated" });
        const res = await fetch(`/api/plans/${planId}/assistant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, reply: result.reply || "Done.", changes: result.changes }),
        });
        if (res.ok) {
          const data = (await res.json()) as { userMessage: Message; reply: Message };
          setMessages((m) => [...m, data.userMessage, data.reply]);
          speakIfAutoRead(data.reply.content, data.reply.id);
        } else {
          // Keep the answer on screen even if it couldn't be stored.
          const now = Date.now();
          setMessages((m) => [
            ...m,
            { id: `u${now}`, role: "user", content: message, changes: [] },
            { id: `a${now}`, role: "assistant", content: result.reply, changes: result.changes },
          ]);
          speakIfAutoRead(result.reply, `a${now}`);
        }
      } catch (error) {
        console.error("[assistant]", error);
        setInput(message);
        toast({
          message:
            engine.status === "unsupported" ? engine.reason : "The assistant couldn’t respond. Please try again.",
          tone: "error",
        });
      } finally {
        setPending(null);
      }
    },
    [pending, planId, plan, messages, responseStyle, applyBatch, toast, engine],
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-12 shrink-0 items-center px-5">
        <h2 className="text-[13px] font-medium text-fg">Assistant</h2>
        <span className="ml-2 text-xs text-fg-subtle">Ask AI about this plan</span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 scrollbar-thin" aria-live="polite">
        {loaded && messages.length === 0 && !pending && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ease.expo }} className="pt-6">
            <p className="text-[15px] font-medium tracking-[-0.01em] text-fg">What should happen next?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              I can reschedule, simplify, add or remove work, and answer questions using the actual plan.
            </p>
            <div className="mt-4 flex flex-col items-start gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg active:scale-[0.98]"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-5 pt-2">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring.soft}
                className={cn(m.role === "user" ? "flex justify-end" : "")}
              >
                {m.role === "user" ? (
                  <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border bg-surface px-3.5 py-2 shadow-xs text-[13.5px] leading-relaxed text-fg">
                    {m.content}
                  </p>
                ) : (
                  <div className="text-[13.5px] leading-relaxed text-fg-muted">
                    <Markdown text={m.content} />
                    {m.changes.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1 rounded-xl border border-border bg-surface px-3 py-2">
                        {m.changes.map((c, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-fg">
                            <Check className="size-3 text-accent" strokeWidth={2.5} aria-hidden />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    <SpeakButton id={m.id} text={m.content} className="-ml-1.5 mt-2" />
                  </div>
                )}
              </motion.div>
            ))}
            {pending && (
              <motion.div key="pending" className="flex flex-col gap-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-end">
                  <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border bg-surface px-3.5 py-2 shadow-xs text-[13.5px] leading-relaxed">
                    {pending}
                  </p>
                </div>
                <p className="flex items-center gap-2 text-[13px] text-fg-subtle">
                  <ThinkingDots />{" "}
                  {engine.status === "loading"
                    ? `Loading the on-device model · ${Math.round(engine.progress * 100)}%`
                    : "Looking at your plan…"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <form
        className="shrink-0 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 pl-3.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-accent-line focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
          <label htmlFor="assistant-input" className="sr-only">
            Message the assistant
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Adjust the plan…"
            maxLength={4000}
            className="max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed outline-none placeholder:text-fg-subtle"
          />
          <DictationButton value={input} onChange={setInput} size="sm" />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            transition={spring.press}
            disabled={!input.trim() || Boolean(pending)}
            aria-label="Send"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-fg text-bg transition-opacity disabled:opacity-25"
          >
            <ArrowUp className="size-4" strokeWidth={2.2} />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
