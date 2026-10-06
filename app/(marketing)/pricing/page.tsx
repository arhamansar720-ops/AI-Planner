import type { Metadata } from "next";
import { FinalCta } from "@/components/landing/final-cta";
import { Pricing } from "@/components/landing/pricing";
import { SectionHeading } from "@/components/landing/sections";
import { Faq, PageHeader } from "@/components/landing/showcases";

export const metadata: Metadata = { title: "Pricing" };

const FAQ: [string, string][] = [
  ["Is the free plan really free?", "Yes. The AI runs on your own device, so planning costs us nothing to run. Free includes on-device planning, the assistant, voice and connections."],
  ["What do paid plans add?", "More active plans, files and past plans as context, calendar export and reminders, version history and, on Team, shared plans."],
  ["Can I cancel any time?", "Yes. If you downgrade, your plans stay yours. You keep access to everything you’ve created."],
  ["Do students get a discount?", "Not yet, but the free plan already covers almost everything a student needs: on-device planning, the assistant, voice and connections."],
];

export default function PricingPage() {
  return (
    <>
      <PageHeader eyebrow="Pricing" title="Start free. Upgrade when your plans do." lede="The on-device AI is free on every plan, because it runs on your hardware." />
      <section className="px-4 pb-24">
        <Pricing />
      </section>
      <section aria-labelledby="faq-title" className="px-4 pb-10">
        <SectionHeading id="faq-title" eyebrow="Questions" title="Pricing, answered" />
        <Faq items={FAQ} />
      </section>
      <FinalCta title="Try it free today." />
    </>
  );
}
