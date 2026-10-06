"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Magnet from "@/components/reactbits/Magnet";
import { Button } from "@/components/ui/button";
import { DictationButton } from "@/components/voice/dictation-button";
import { ease } from "@/lib/motion";

/** A replica of the product's prompt box. Submitting hands the goal to the app. */
export function FinalCta({ title = "What do you want to get done?" }: { title?: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");

  const submit = () => {
    const prompt = goal.trim();
    if (prompt.length < 2) return;
    try {
      sessionStorage.setItem("forma:draft", JSON.stringify({ prompt, context: [] }));
    } catch {}
    router.push("/app");
  };

  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden px-4 pb-28 pt-16 sm:pb-36">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[360px] w-[640px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-[0.08] blur-[100px] dark:opacity-[0.16]"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: ease.expo }}
        className="mx-auto flex max-w-[720px] flex-col items-center text-center"
      >
        <h2 id="cta-title" className="text-balance text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
          {title}
        </h2>
        <p className="mt-4 text-[16px] text-fg-muted">Type it, or say it. Forma takes it from there.</p>
        <form
          className="glass mt-9 flex w-full items-end gap-2 rounded-[22px] p-3 pl-5 text-left transition-shadow focus-within:ring-1 focus-within:ring-accent-line"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="landing-goal" className="sr-only">
            Your goal
          </label>
          <textarea
            id="landing-goal"
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Get ready for finals in three weeks…"
            className="min-h-[52px] flex-1 resize-none bg-transparent py-2 text-[16px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <DictationButton value={goal} onChange={setGoal} />
          <Magnet padding={40} magnetStrength={5}>
            <Button type="submit" variant="primary" size="icon" className="size-10 rounded-xl" aria-label="Plan it" disabled={goal.trim().length < 2}>
              <ArrowUp />
            </Button>
          </Magnet>
        </form>
      </motion.div>
    </section>
  );
}
