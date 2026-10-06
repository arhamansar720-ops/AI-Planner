import type { Metadata } from "next";
import { Bento } from "@/components/landing/bento";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { SectionHeading } from "@/components/landing/sections";
import { ModesShowcase } from "@/components/landing/showcases";
import { Story, WorksWith } from "@/components/landing/story";
import { getSession } from "@/lib/auth/session";
import { product } from "@/lib/config";
import { isDatabaseConfigured } from "@/lib/db/env";

export const metadata: Metadata = {
  title: { absolute: `${product.name} · ${product.tagline}` },
  description: "Describe a goal and watch Forma build the plan live, written by an AI that runs on your own device.",
};

export default async function HomePage() {
  const signedIn = isDatabaseConfigured() ? Boolean((await getSession()).user) : false;
  return (
    <>
      <Hero signedIn={signedIn} />

      <section aria-label="Tools Forma plans around" className="pb-24 pt-10 sm:pb-32">
        <WorksWith />
      </section>

      <section aria-labelledby="how-title" className="pb-16 sm:pb-24">
        <div className="px-4">
          <SectionHeading
            id="how-title"
            index="01"
            eyebrow="How it works"
            title="From a sentence to a schedule"
            lede="No templates and no blank pages. Describe the goal, watch the plan arrive, and start on today’s work."
          />
        </div>
        <Story />
      </section>

      <section aria-labelledby="features-title" className="pb-24 sm:pb-32">
        <div className="px-4">
          <SectionHeading
            id="features-title"
            index="02"
            eyebrow="Features"
            title="A plan that keeps up with you"
            lede="Forma doesn’t stop at a to-do list. It schedules the work, tracks what depends on what and changes the plan when your week does."
          />
        </div>
        <Bento />
      </section>

      <section aria-labelledby="modes-title" className="px-4 pb-16">
        <SectionHeading
          id="modes-title"
          index="03"
          eyebrow="Made for you"
          title="It knows who it’s planning for"
          lede="Students, professionals, founders, creators, athletes and busy households each get pacing, methods and suggestions tuned to them."
        />
        <ModesShowcase />
      </section>

      <FinalCta />
    </>
  );
}
