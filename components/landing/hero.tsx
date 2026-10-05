"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";
import CountUp from "@/components/reactbits/CountUp";
import Magnet from "@/components/reactbits/Magnet";
import RotatingText from "@/components/reactbits/RotatingText";
import ShinyText from "@/components/reactbits/ShinyText";
import Threads from "@/components/reactbits/Threads";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion";
import { useAccentRGB } from "./use-accent";

const GOALS = ["a half marathon", "your thesis", "a product launch", "moving abroad", "learning Spanish", "a kitchen remodel"];

export function Hero() {
  const reduce = useReducedMotion();
  const accent = useAccentRGB();

  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:pb-28 sm:pt-24">
      {/* Threads drawn in the accent, fading out toward the edges. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[24%] -z-10 h-[620px] opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)] dark:opacity-75"
        aria-hidden
      >
        {accent && !reduce && (
          <Threads color={accent} amplitude={1.1} distance={0.1} enableMouseInteraction />
        )}
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-accent opacity-[0.07] blur-[110px] dark:opacity-[0.14]"
        aria-hidden
      />

      <div className="mx-auto flex max-w-[880px] flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: ease.expo }}
          className="glass mb-7 inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px]"
        >
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          <ShinyText
            text="Private by design · the AI runs on your device"
            color="var(--fg-muted)"
            shineColor="var(--fg)"
            speed={3}
            disabled={!!reduce}
          />
        </motion.div>

        <h1 className="text-balance text-[clamp(2.5rem,7vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-fg">
          <BlurText
            as="span"
            text="One sentence in."
            delay={90}
            animateBy="words"
            direction="top"
            className="justify-center"
          />
          <span className="mt-1 flex flex-wrap items-center justify-center gap-x-[0.25em]">
            <BlurText as="span" text="A plan for" delay={90} animateBy="words" direction="top" className="justify-center" />
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="inline-flex overflow-hidden rounded-[0.3em] bg-accent px-[0.28em] pb-[0.06em] text-accent-fg"
            >
              <RotatingText
                texts={GOALS}
                rotationInterval={2600}
                staggerDuration={0.02}
                staggerFrom="last"
                splitBy="characters"
                mainClassName="overflow-hidden"
                splitLevelClassName="overflow-hidden pb-[0.08em]"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                auto={!reduce}
              />
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: ease.expo }}
          className="mt-7 max-w-[560px] text-balance text-[17px] leading-relaxed text-fg-muted"
        >
          Tell Forma what you want to accomplish. It writes the phases, tasks, dependencies and timeline live in
          front of you, then keeps the schedule honest as life moves.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: ease.expo }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnet padding={60} magnetStrength={4} disabled={!!reduce}>
            <Button asChild variant="primary" size="lg" className="rounded-full px-6">
              <Link href="/">
                Start planning <ArrowRight />
              </Link>
            </Button>
          </Magnet>
          <Button asChild variant="secondary" size="lg" className="rounded-full px-6">
            <a href="#demo">
              <Play className="fill-current" /> Watch it plan
            </a>
          </Button>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 grid w-full max-w-[640px] grid-cols-3 divide-x divide-border"
        >
          <Stat label="parameters, running on your GPU">
            <CountUp to={8} duration={1.6} />B
          </Stat>
          <Stat label="calls to an AI provider">
            <CountUp from={0} to={100} direction="down" duration={2} />
          </Stat>
          <Stat label="planning stages, streamed live">
            <CountUp to={7} duration={1.8} />
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
