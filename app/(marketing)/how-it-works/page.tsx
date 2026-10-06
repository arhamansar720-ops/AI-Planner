import type { Metadata } from "next";
import { FinalCta } from "@/components/landing/final-cta";
import { LiveDemo } from "@/components/landing/live-demo";
import { HowItWorks, SectionHeading } from "@/components/landing/sections";
import { Faq, PageHeader } from "@/components/landing/showcases";

export const metadata: Metadata = { title: "How it works" };

const FAQ: [string, string][] = [
  ["Do I need to install anything?", "No. Forma runs in Chrome or Edge on a computer. The first time you plan, your browser downloads the AI model (about 5 GB) and keeps it, so later visits start in seconds."],
  ["Where does my data go?", "The AI runs on your device, so your goals aren’t sent to an AI provider. Your saved plans and chats are stored in your private Forma account so you can open them anywhere."],
  ["What if my plans change?", "Tell the assistant (“I can’t work Fridays”, “push the launch two weeks”) or drag tasks on the timeline. Forma reschedules everything that depends on it, and every change can be undone."],
  ["Can it see my school assignments?", "Yes, if you connect them. Schoology, Canvas, Outlook, Google and Apple calendars connect with a private calendar link; Skyward works by pasting your assignments page."],
  ["Does it work on my phone?", "You can read and update your plans on a phone. Creating new plans needs a computer with a capable graphics chip, because the AI runs on your device."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="From one sentence to a schedule"
        lede="Describe a goal. Watch the plan appear. Then let Forma keep it realistic as your days change."
      />
      <section className="px-4 pb-20">
        <HowItWorks />
      </section>
      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-24 px-4 pb-24 sm:pb-32">
        <SectionHeading
          id="demo-title"
          eyebrow="See it live"
          title="Every phase, task and deadline, as it’s written"
          lede="This is the real canvas, replaying a real plan streamed by the model."
        />
        <div className="relative mx-auto flex max-w-[1180px] justify-center">
          <LiveDemo />
        </div>
      </section>
      <section aria-labelledby="faq-title" className="px-4 pb-10">
        <SectionHeading id="faq-title" eyebrow="Questions" title="Good to know" />
        <Faq items={FAQ} />
      </section>
      <FinalCta />
    </>
  );
}
