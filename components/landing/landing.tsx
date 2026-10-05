"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUp, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import Magnet from "@/components/reactbits/Magnet";
import { useTheme } from "@/components/shell/theme";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { product } from "@/lib/config";
import { ease } from "@/lib/motion";
import { Hero } from "./hero";
import { LiveDemo } from "./live-demo";
import { Pricing } from "./pricing";
import { Features, GoalsMarquee, HowItWorks, SectionHeading } from "./sections";

const DRAFT_KEY = "forma:draft";

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-20" aria-hidden>
        <div className="app-grain absolute inset-0">
          <div className="app-backdrop app-backdrop-mask absolute inset-0" />
        </div>
      </div>

      <LandingNav />

      <main id="main">
        <Hero />

        <section id="demo" aria-labelledby="demo-title" className="scroll-mt-20 px-4 pb-24 sm:pb-32">
          <SectionHeading
            id="demo-title"
            eyebrow="Live, not a loading spinner"
            title="Watch a plan assemble itself"
            lede="This is the real planning canvas, replaying a real plan as the model streamed it: goal, phases, tasks, dependencies, then the timeline."
          />
          <div className="relative mx-auto flex max-w-[1080px] justify-center">
            <div
              className="pointer-events-none absolute left-1/2 top-[18%] h-[60%] w-[70%] -translate-x-1/2 rounded-full bg-accent opacity-[0.07] blur-[90px] dark:opacity-[0.12]"
              aria-hidden
            />
            <LiveDemo />
          </div>
        </section>

        <section aria-label="Example goals" className="pb-24 sm:pb-32">
          <GoalsMarquee />
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 px-4 pb-24 sm:pb-32">
          <SectionHeading id="how-title" eyebrow="How it works" title="From a sentence to a schedule in three steps" />
          <HowItWorks />
        </section>

        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 px-4 pb-24 sm:pb-32">
          <SectionHeading
            id="features-title"
            eyebrow="Features"
            title="A plan that keeps up with you"
            lede="Forma doesn’t stop at a to-do list. It schedules the work, tracks what depends on what and changes the plan when you ask."
          />
          <Features />
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 px-4 pb-24 sm:pb-32">
          <SectionHeading
            id="pricing-title"
            eyebrow="Pricing"
            title="Start free. Upgrade when your plans do."
            lede="The on-device AI is free on every plan, because it runs on your hardware."
          />
          <Pricing />
        </section>

        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

function LandingNav() {
  const { scrollY } = useScroll();
  const border = useTransform(scrollY, [0, 40], [0, 1]);
  const { setTheme } = useTheme();
  const dark = useIsDark();

  return (
    <header className="sticky top-0 z-40">
      <motion.div style={{ opacity: border }} className="glass absolute inset-0 rounded-none border-x-0 border-t-0" aria-hidden />
      <div className="relative mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-4 sm:px-5">
        <Link href="/landing" className="-ml-1 rounded-lg px-1 py-1" aria-label={`${product.name} home`}>
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {[
            ["#how", "How it works"],
            ["#features", "Features"],
            ["#pricing", "Pricing"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-1.5 text-[14px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="primary" size="sm" className="rounded-full px-4">
            <Link href="/">Start planning</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Whether the dark theme is applied (a class on <html>); false while hydrating. */
function useIsDark() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

/** A replica of the product's prompt box. Submitting hands the goal to the app. */
function FinalCta() {
  const router = useRouter();
  const [goal, setGoal] = useState("");

  const submit = () => {
    const prompt = goal.trim();
    if (prompt.length < 2) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ prompt, context: [] }));
    } catch {}
    router.push("/");
  };

  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden px-4 pb-28 pt-8 sm:pb-36">
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
          What do you want to get done?
        </h2>
        <p className="mt-4 text-[16px] text-fg-muted">Type it here. Forma takes it from there.</p>

        <form
          className="glass mt-9 flex w-full items-end gap-3 rounded-[22px] p-3 pl-5 text-left transition-shadow focus-within:ring-1 focus-within:ring-accent-line"
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
            placeholder="Launch my online store before the holidays…"
            className="min-h-[52px] flex-1 resize-none bg-transparent py-2 text-[16px] text-fg outline-none placeholder:text-fg-subtle"
          />
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

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <p className="text-[13px] text-fg-subtle">{product.tagline}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-fg-muted">
          <a href="#features" className="hover:text-fg">
            Features
          </a>
          <a href="#pricing" className="hover:text-fg">
            Pricing
          </a>
          <Link href="/login" className="hover:text-fg">
            Sign in
          </Link>
          <Link href="/" className="hover:text-fg">
            Open the app
          </Link>
        </nav>
        <p className="text-[12px] text-fg-subtle">
          © {new Date().getFullYear()} {product.name}. Animations from{" "}
          <a href="https://reactbits.dev" className="underline underline-offset-2 hover:text-fg">
            React Bits
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
