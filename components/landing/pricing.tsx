"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CountUp from "@/components/reactbits/CountUp";
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
                "relative flex flex-col rounded-[20px] border p-7 shadow-[0_1px_0_var(--glass-highlight)_inset]",
                featured ? "border-accent-line bg-surface shadow-[0_1px_0_var(--glass-highlight)_inset,0_30px_60px_-30px_var(--accent)]" : "border-border bg-surface/70",
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
                  <span className="rounded-full bg-accent-soft px-2.5 py-1">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent">Most popular</span>
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

/* Comparison --------------------------------------------------------------- */

type Cell = boolean | string;
const COMPARISON: { group: string; rows: [string, Cell, Cell, Cell][] }[] = [
  {
    group: "Planning",
    rows: [
      ["On-device AI planning", true, true, true],
      ["Active plans", "3", "Unlimited", "Unlimited"],
      ["Assistant that edits the plan", true, true, true],
      ["Files and past plans as context", false, true, true],
    ],
  },
  {
    group: "Schedule",
    rows: [
      ["Self-scheduling calendar", true, true, true],
      ["Calendar connections (Schoology, Outlook…)", true, true, true],
      ["Calendar export and reminders", false, true, true],
      ["Version history", false, true, true],
    ],
  },
  {
    group: "Together",
    rows: [
      ["Shared plans and assignees", false, false, true],
      ["Comments on tasks", false, false, true],
      ["Admin and billing controls", false, false, true],
    ],
  },
];

/** Every plan side by side, the way people actually decide. */
export function PricingComparison() {
  return (
    <div className="mx-auto max-w-[1080px] overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        <caption className="sr-only">Compare plans</caption>
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className="w-[40%] py-4 font-medium text-fg-subtle">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em]">Compare plans</span>
            </th>
            {PLANS.map((p) => (
              <th key={p.name} scope="col" className="py-4 text-center text-[15px] font-semibold">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        {COMPARISON.map((section) => (
          <tbody key={section.group}>
            <tr>
              <th colSpan={4} scope="colgroup" className="pb-2 pt-8 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
                {section.group}
              </th>
            </tr>
            {section.rows.map(([label, ...cells]) => (
              <tr key={label} className="border-b border-border">
                <th scope="row" className="py-3.5 pr-4 font-normal text-fg-muted">
                  {label}
                </th>
                {cells.map((c, i) => (
                  <td key={i} className="py-3.5 text-center">
                    {c === true ? (
                      <Check className="mx-auto size-4 text-accent" strokeWidth={2.4} aria-label="Included" />
                    ) : c === false ? (
                      <Minus className="mx-auto size-4 text-fg-subtle/60" aria-label="Not included" />
                    ) : (
                      <span className="text-[13.5px] font-medium text-fg">{c}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

