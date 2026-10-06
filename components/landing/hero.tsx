"use client";

import { motion, useReducedMotionConfig } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import Magnet from "@/components/reactbits/Magnet";
import Threads from "@/components/reactbits/Threads";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion";
import { RotatingWord } from "./rotating-word";
import { useAccentRGB } from "./use-accent";

const GOALS = ["a half marathon", "your thesis", "a product launch", "moving abroad", "learning Spanish", "finals week"];

export function Hero({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotionConfig();
  const accent = useAccentRGB();

  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:pb-28 sm:pt-24">
      {/* Threads drawn in the accent, behind the lower half of the hero. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[38%] -z-10 hidden h-[560px] opacity-45 sm:block [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)] dark:opacity-70"
        aria-hidden
      >
        {accent && !reduce && <Threads color={accent} amplitude={1} distance={0.12} enableMouseInteraction />}
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-accent opacity-[0.07] blur-[110px] dark:opacity-[0.14]"
        aria-hidden
      />

      <div className="mx-auto flex max-w-[920px] flex-col items-center text-center">
        <h1 className="flex flex-col items-center text-[clamp(2.4rem,6.6vw,4.6rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-fg">
          <BlurText as="span" text="One sentence in." delay={80} animateBy="words" direction="top" className="justify-center" />
          <BlurText as="span" text="A plan for" delay={80} animateBy="words" direction="top" className="justify-center" />
          <motion.span
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.45, ease: ease.expo }}
            className="mt-2"
          >
            <RotatingWord words={GOALS} />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: ease.expo }}
          className="mt-8 max-w-[580px] text-pretty text-[17px] leading-relaxed text-fg-muted"
        >
          Tell Forma what you want to accomplish. It writes the phases, tasks, deadlines and timeline in front of you, then
          keeps the schedule honest as life moves.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.72, ease: ease.expo }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnet padding={60} magnetStrength={4} disabled={!!reduce}>
            <Button asChild variant="primary" size="lg" className="rounded-full px-6">
              <Link href={signedIn ? "/app" : "/login?mode=signup"}>
                {signedIn ? "Open Forma" : "Get started free"} <ArrowRight />
              </Link>
            </Button>
          </Magnet>
          <Button asChild variant="secondary" size="lg" className="rounded-full px-6">
            <Link href="/how-it-works#demo">
              <Play className="fill-current" /> Watch it plan
            </Link>
          </Button>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 grid w-full max-w-[640px] grid-cols-3 divide-x divide-border"
        >
          <Stat label="parameters, running on your GPU">
            <CountUp to={8} duration={1.6} />B
          </Stat>
          <Stat label="calls to an AI provider">
            <CountUp from={0} to={100} direction="down" duration={2} />
          </Stat>
          <Stat label="modes, from student to founder">
            <CountUp to={6} duration={1.8} />
          </Stat>
        </motion.dl>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <dt className="sr-only">{label}</dt>
      <dd className="text-[clamp(1.5rem,4vw,2.1rem)] font-semibold tabular-nums tracking-[-0.03em] text-fg">{children}</dd>
      <dd className="text-balance text-xs leading-snug text-fg-subtle sm:text-[13px]">{label}</dd>
    </div>
  );
}
