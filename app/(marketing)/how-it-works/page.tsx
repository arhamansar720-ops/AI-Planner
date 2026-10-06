import type { Metadata } from "next";
import { FinalCta } from "@/components/landing/final-cta";
import { LiveDemo } from "@/components/landing/live-demo";
import { ProductFrame } from "@/components/landing/product-frame";
import { SectionHeading } from "@/components/landing/sections";
import { Faq, PageHeader } from "@/components/landing/showcases";
import { Story } from "@/components/landing/story";

export const metadata: Metadata = { title: "How it works" };

const FAQ: [string, string][] = [
  ["Do I need to install anything?", "No. Forma runs in Chrome or Edge on a computer. The first time you plan, your browser downloads an AI model sized for your computer (about 1 to 4.5 GB) and keeps it, so later visits start in seconds."],
  ["Where does my data go?", "The AI runs on your device, so your goals aren’t sent to an AI provider. Your saved plans and chats are stored in your private Forma account so you can open them anywhere."],
  ["What if my plans change?", "Tell the assistant (“I can’t work Fridays”, “push the launch two weeks”) or drag tasks on the timeline. Forma reschedules everything that depends on it, and every change can be undone."],
  ["Can it see my school assignments?", "Yes, if you connect them. Schoology, Canvas, Outlook, Google and Apple calendars connect with a private calendar link; Skyward works by pasting your assignments page."],
  ["Does it work on my phone?", "You can read and update your plans on a phone. Creating new plans needs a computer with a capable graphics chip, because the AI runs on your device."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="How it works" title="From one sentence to a schedule" lede="Describe a goal. Watch the plan appear. Then let Forma keep it realistic as your days change." />
      <section aria-label="Steps" className="pb-16">
        <Story />
      </section>
      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 border-t border-border px-4 pb-24 pt-20 sm:pb-32 sm:pt-28">
        <SectionHeading
          id="demo-title"
          index="↳"
          eyebrow="See it live"
          title="Every phase and deadline, as it’s written"
          lede="This is the real canvas, replaying a real plan streamed by the model: goal, phases, tasks, dependencies, then the timeline."
        />
        <ProductFrame>
          <div className="px-3 pb-8 pt-2 sm:px-8 sm:pb-12">
            <LiveDemo />
          </div>
        </ProductFrame>
      </section>
      <section aria-labelledby="faq-title" className="border-t border-border px-4 pb-10 pt-20 sm:pt-28">
        <SectionHeading id="faq-title" eyebrow="Questions" title="Good to know" />
        <Faq items={FAQ} />
      </section>
      <FinalCta />
    </>
  );
}
