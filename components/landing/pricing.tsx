"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CountUp from "@/components/reactbits/CountUp";
import ShinyText from "@/components/reactbits/ShinyText";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

type Billing = "monthly" | "yearly";

/** Placeholder tiers: no payment provider is connected yet. */
const PLANS = [
  {
    name: "Free",
    blurb: "Everything you need to plan your own goals.",
    price: { monthly: 0, yearly: 0 },
    unit: "forever",
    cta: "Start planning",
    features: ["On-device AI planning", "Up to 3 active plans", "Timeline, calendar and tasks", "Assistant edits with undo"],
  },
  {
    name: "Pro",
    blurb: "For people who always have something in motion.",
    price: { monthly: 9, yearly: 7 },
    unit: "per month",
    cta: "Go Pro",
    featured: true,
    features: [
      "Unlimited active plans",
      "Files and past plans as context",
      "Calendar export and reminders",
      "Version history for every plan",
      "Priority access to new models",
    ],
  },
  {
    name: "Team",
    blurb: "Shared plans for small teams and projects.",
    price: { monthly: 16, yearly: 13 },
    unit: "per member / month",
    cta: "Start a team",
    features: ["Everything in Pro", "Shared plans and assignees", "Comments on tasks", "Admin and billing controls"],
  },
] as const;

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="mb-10 flex justify-center">
        <Segmented
          label="Billing period"
          value={billing}
          onChange={setBilling}
          options={[
            { value: "monthly", label: "Monthly" },
            {
              value: "yearly",
              label: (
                <>
                  Yearly <span className="rounded-full bg-accent-soft px-1.5 py-px text-[11px] text-accent">−20%</span>
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {PLANS.map((plan, i) => {
          const featured = "featured" in plan && plan.featured;
          const price = plan.price[billing];
          return (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: ease.expo }}
              className={cn(
                "relative flex flex-col rounded-3xl p-7",
                featured ? "glass ring-1 ring-accent-line md:-my-3 md:py-10" : "border border-border bg-surface",
              )}
              aria-label={`${plan.name} plan`}
            >
              {featured && (
                <div
                  className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent"
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{plan.name}</h3>
                {featured && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium">
                    <ShinyText text="Most popular" color="var(--accent)" shineColor="var(--fg)" speed={2.5} />
                  </span>
                )}
              </div>
              <p className="mt-2 text-[14px] text-fg-muted">{plan.blurb}</p>

              <p className="mt-7 flex items-baseline gap-1.5">
                <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                  $<CountUp to={price} duration={0.8} />
                </span>
                <span className="text-[13px] text-fg-subtle">{plan.unit}</span>
              </p>
              <p className="mt-1.5 h-4 text-[12px] text-fg-subtle">
                {billing === "yearly" && price > 0 ? `Billed $${price * 12} yearly` : ""}
              </p>

              <Button
                asChild
                variant={featured ? "accent" : "secondary"}
                size="lg"
                className="mt-7 w-full rounded-full"
              >
                <Link href={price === 0 ? "/login?mode=signup" : `/login?mode=signup&plan=${plan.name.toLowerCase()}-${billing}`}>{plan.cta}</Link>
              </Button>

              <ul className="mt-8 flex flex-col gap-3 border-t border-border pt-7 text-[14px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-accent" : "text-fg-subtle")} strokeWidth={2.4} />
                    <span className="text-fg-muted">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </div>
      <p className="mt-8 text-center text-[13px] text-fg-subtle">
        Prices in USD. Cancel any time. Your plans stay yours if you downgrade.
      </p>
    </div>
  );
}
