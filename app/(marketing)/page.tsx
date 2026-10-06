import type { Metadata } from "next";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { LiveDemo } from "@/components/landing/live-demo";
import { GoalsMarquee, SectionHeading } from "@/components/landing/sections";
import { Highlights, ModesShowcase } from "@/components/landing/showcases";
import { isSupabaseConfigured } from "@/lib/db/env";
import { getSession } from "@/lib/db/server";
import { product } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: `${product.name} · ${product.tagline}` },
  description: "Describe a goal and watch Forma build the plan live, written by an AI that runs on your own device.",
};

export default async function HomePage() {
  const signedIn = isSupabaseConfigured() ? Boolean((await getSession()).user) : false;
  return (
    <>
      <Hero signedIn={signedIn} />

      <section aria-labelledby="demo-title" className="px-4 pb-24 sm:pb-32">
        <SectionHeading
          id="demo-title"
          eyebrow="Live, not a loading spinner"
          title="Watch a plan assemble itself"
          lede="The real planning canvas, replaying a real plan as the model wrote it."
        />
        <div className="relative mx-auto flex max-w-[1180px] justify-center">
          <LiveDemo />
        </div>
      </section>

      <section aria-label="Example goals" className="pb-24 sm:pb-32">
        <GoalsMarquee />
      </section>

      <section aria-labelledby="modes-title" className="px-4 pb-24 sm:pb-32">
        <SectionHeading
          id="modes-title"
          eyebrow="Made for you"
          title="A planner that knows who it’s planning for"
          lede="Pick a mode and Forma changes how it plans: pacing, methods, suggestions and defaults."
        />
        <ModesShowcase />
      </section>

      <section aria-labelledby="highlights-title" className="px-4 pb-16">
        <SectionHeading id="highlights-title" eyebrow="Why Forma" title="Everything a plan needs, nothing it doesn’t" />
        <Highlights />
      </section>

      <FinalCta />
    </>
  );
}
