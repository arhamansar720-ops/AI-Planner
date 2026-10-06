"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion";
import { LiveDemo } from "./live-demo";
import { ProductFrame } from "./product-frame";
import { RotatingWord } from "./rotating-word";

const GOALS = ["a half marathon", "your thesis", "a product launch", "moving abroad", "learning Spanish", "finals week"];

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: ease.expo },
});

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-14 sm:pt-20">
      {/* A faint grid that fades out toward the edges: structure, not decoration. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent)]"
        aria-hidden
      />

      <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
        <motion.div {...rise(0)}>
          <Link
            href="/features#voice"
            className="group inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface/70 py-1 pl-1 pr-3 text-[13px] text-fg-muted shadow-xs backdrop-blur transition-colors hover:border-border-strong hover:text-fg"
          >
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent">New</span>
            Voice, modes and calendar connections
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <h1 className="mt-8 flex flex-col items-center text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-fg">
          <BlurText as="span" text="One sentence in." delay={70} animateBy="words" direction="top" className="justify-center" />
          <span className="flex flex-wrap items-center justify-center gap-x-[0.24em] gap-y-2">
            <BlurText as="span" text="A plan for" delay={70} animateBy="words" direction="top" className="justify-center text-fg-muted" />
            <motion.span {...rise(0.35)}>
              <RotatingWord words={GOALS} />
            </motion.span>
          </span>
        </h1>

        <motion.p {...rise(0.5)} className="mt-7 max-w-[540px] text-pretty text-[17.5px] leading-[1.6] text-fg-muted">
          Describe what you want to accomplish. Forma writes the phases, tasks and deadlines in front of you, then keeps the
          schedule realistic as your weeks change.
        </motion.p>

        <motion.div {...rise(0.6)} className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Button asChild variant="primary" size="lg" className="group h-12 rounded-full pl-6 pr-5 text-[15px]">
            <Link href={signedIn ? "/app" : "/login?mode=signup"}>
              {signedIn ? "Open Forma" : "Start planning, free"}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Link href="/how-it-works" className="group inline-flex items-center gap-1 text-[15px] font-medium text-fg-muted transition-colors hover:text-fg">
            How it works <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.p {...rise(0.7)} className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle sm:text-[11.5px]">
          <span>Free to start</span>
          <span aria-hidden>·</span>
          <span>AI runs on your device</span>
          <span aria-hidden>·</span>
          <span>No credit card</span>
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.75, ease: ease.expo }}
        className="mt-16 sm:mt-20"
      >
        <ProductFrame>
          <div className="px-3 pb-8 pt-2 sm:px-8 sm:pb-12">
            <LiveDemo />
          </div>
        </ProductFrame>
      </motion.div>
    </section>
  );
}
