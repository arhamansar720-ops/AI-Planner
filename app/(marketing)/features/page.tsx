import type { Metadata } from "next";
import { Bento } from "@/components/landing/bento";
import { FinalCta } from "@/components/landing/final-cta";
import { SectionHeading } from "@/components/landing/sections";
import { ConnectionsVisual, FeatureRow, ModesShowcase, PageHeader, ThemesVisual, VoiceVisual } from "@/components/landing/showcases";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="Everything a plan needs, nothing it doesn’t"
        lede="Forma schedules the work, tracks what depends on what, talks with you, and changes the plan when life does."
      />
      <section aria-label="Overview" className="pb-10">
        <Bento />
      </section>

      <div className="border-t border-border">
        <FeatureRow
          id="connections"
          eyebrow="Connections"
          title="Plans built around your real deadlines"
          body="Connect the tools you already use and Forma reads your upcoming assignments and events, then plans around them. Read-only: it never changes anything."
          points={[
            "Schoology, Canvas, Outlook, Google Calendar and Apple Calendar",
            "Skyward, by pasting your assignments page",
            "Every plan exports to your calendar in one click",
          ]}
          visual={<ConnectionsVisual />}
        />
      </div>
      <div className="border-t border-border">
        <FeatureRow
          id="voice"
          flip
          eyebrow="Voice"
          title="Talk to Forma. Hear it back."
          body="Dictate a goal instead of typing it, and have the assistant read its answers aloud. Pick from the natural voices already on your device: free, nothing to download."
          points={["Press-to-preview voice picker with speed control", "Read replies aloud automatically, or tap Listen", "Your plan is announced when it’s ready"]}
          visual={<VoiceVisual />}
        />
      </div>
      <div className="border-t border-border">
        <FeatureRow
          id="themes"
          eyebrow="Personalize"
          title="Your colors, your comfort"
          body="Light, dark and seven color themes, from pastel pink to baby blue. Plus accessibility settings that apply everywhere: larger text, higher contrast, reduced motion, readable spacing and underlined links."
          visual={<ThemesVisual />}
        />
      </div>
      <div className="border-t border-border">
        <FeatureRow
          id="privacy"
          flip
          eyebrow="Private by design"
          title="The AI runs on your device"
          body="Forma’s planning model runs in your browser on your own graphics chip, sized to what your computer can handle. Your goals aren’t sent to an AI provider, and there’s no API bill behind your plans."
          points={["Three sizes, picked automatically for your device", "Downloads once, then loads in seconds", "Works in Chrome and Edge with WebGPU"]}
          visual={
            <div className="rounded-[20px] border border-border bg-surface p-6 font-mono text-[13px] text-fg-muted shadow-[0_1px_0_var(--glass-highlight)_inset]">
              {[
                ["Model", "Qwen3 · 1.7B, 4B or 8B"],
                ["Runs on", "Your GPU (WebGPU)"],
                ["Calls to AI providers", "0"],
                ["Context window", "8,192 tokens"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-3 last:border-0">
                  <span>{k}</span>
                  <span className="text-fg">{v}</span>
                </div>
              ))}
            </div>
          }
        />
      </div>

      <section aria-labelledby="modes-title" className="border-t border-border px-4 py-20 sm:py-28">
        <SectionHeading
          id="modes-title"
          eyebrow="Modes"
          title="Six ways to plan"
          lede="Students, professionals, founders, creators, athletes and busy households each get a planner tuned to them."
        />
        <ModesShowcase />
      </section>

      <FinalCta title="Ready when you are." />
    </>
  );
}
