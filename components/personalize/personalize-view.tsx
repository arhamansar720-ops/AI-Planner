"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { PALETTES, setAppearance, useAppearance, type Appearance } from "@/components/shell/appearance";
import { useTheme, type Theme } from "@/components/shell/theme";
import { Switch } from "@/components/ui/controls";
import { PressTile } from "@/components/ui/press-tile";
import { useToast } from "@/components/ui/toast";
import { VoicePicker } from "@/components/voice/voice-picker";
import type { PublicConnection } from "@/lib/connections/store";
import { ease } from "@/lib/motion";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { cn } from "@/lib/utils/cn";
import { ConnectionsSection } from "./connections";

const SECTIONS = [
  { id: "mode", label: "Your mode", emoji: "🧭" },
  { id: "appearance", label: "Appearance", emoji: "🎨" },
  { id: "voice", label: "Voice", emoji: "🎙️" },
  { id: "accessibility", label: "Accessibility", emoji: "♿" },
  { id: "connections", label: "Connections", emoji: "🔗" },
] as const;

const THEMES: { id: Theme; emoji: string; label: string }[] = [
  { id: "light", emoji: "☀️", label: "Light" },
  { id: "dark", emoji: "🌙", label: "Dark" },
  { id: "system", emoji: "💻", label: "Match device" },
];

const noop = () => () => {};

export function PersonalizeView({
  name,
  persona: initialPersona,
  connections,
}: {
  name: string;
  persona: PersonaId | null;
  connections: PublicConnection[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [persona, setPersona] = useState(initialPersona);
  const { theme, setTheme } = useTheme();
  const appearance = useAppearance();
  const isDark = useSyncExternalStore(
    (cb) => {
      const o = new MutationObserver(cb);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => o.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  // Swatches for the palette previews follow the current light/dark mode.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const choosePersona = async (id: PersonaId) => {
    const previous = persona;
    setPersona(id);
    const res = await fetch("/api/setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: id }),
    }).catch(() => null);
    if (!res?.ok) {
      setPersona(previous);
      toast({ message: "Couldn’t change your mode.", tone: "error" });
    } else router.refresh();
  };

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    void fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: t }) });
  };

  const a11y = (patch: Partial<Appearance>) => setAppearance(patch);

  return (
    <main id="main" className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.expo }}>
        <p className="text-[13px] font-medium text-accent">{name ? `Hi, ${name.split(/\s+/)[0]}` : "Personalize"}</p>
        <h1 className="mt-1.5 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-[-0.035em]">Make Forma yours</h1>
        <p className="mt-2 max-w-[560px] text-[15px] text-fg-muted">
          Your mode, colors, voice, accessibility and the tools Forma can read from. Changes apply instantly.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-12 md:grid-cols-[180px_minmax(0,1fr)]">
        <nav className="hidden md:block" aria-label="Personalize sections">
          <ul className="sticky top-8 flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <span aria-hidden>{s.emoji}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-14">
          <Section id="mode" title="Your mode" lede="Forma tailors plans, pacing and suggestions to who you’re planning as.">
            <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {PERSONAS.map((p) => (
                <PressTile key={p.id} size="md" emoji={p.emoji} label={p.label} hint={p.blurb} selected={persona === p.id} onClick={() => choosePersona(p.id)} />
              ))}
            </div>
          </Section>

          <Section id="appearance" title="Appearance" lede="Light or dark, and a color theme that suits you.">
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <PressTile key={t.id} size="md" emoji={t.emoji} label={t.label} selected={theme === t.id} onClick={() => chooseTheme(t.id)} />
              ))}
            </div>
            <p className="mb-3 mt-8 text-[13px] font-medium">Color theme</p>
            <div role="radiogroup" aria-label="Color theme" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {PALETTES.map((p) => {
                const [bg, accent] = mounted && isDark ? p.dark : p.swatch;
                const selected = appearance.palette === p.id;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAppearance({ palette: p.id })}
                    whileHover={{ y: -3 }}
                    whileTap={{ y: 2, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected ? "border-accent shadow-[0_10px_24px_-14px_var(--accent)]" : "border-border-strong",
                    )}
                    style={{ background: bg }}
                  >
                    {/* A tiny mock of the app in this palette. */}
                    <span className="block rounded-xl border border-black/5 bg-white/70 p-2.5 dark:border-white/5 dark:bg-white/[0.04]" aria-hidden>
                      <span className="mb-2 block h-1.5 w-10 rounded-full" style={{ background: accent, opacity: 0.85 }} />
                      <span className="mb-1 block h-1.5 w-16 rounded-full bg-black/10 dark:bg-white/15" />
                      <span className="block h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/15" />
                      <span className="mt-3 flex gap-1">
                        <span className="h-4 w-9 rounded-md" style={{ background: accent }} />
                        <span className="h-4 w-6 rounded-md bg-black/10 dark:bg-white/15" />
                      </span>
                    </span>
                    <span className={cn("mt-2 flex items-center justify-between px-1 text-[13px] font-medium", mounted && isDark ? "text-white" : "text-[#121214]")}>
                      {p.label}
                      {selected && (
                        <span className="flex size-4 items-center justify-center rounded-full" style={{ background: accent }}>
                          <Check className="size-2.5" style={{ color: mounted && isDark ? "#0b0b0d" : "#fff" }} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-fg-subtle">Color themes and accessibility settings are saved on this device.</p>
          </Section>

          <Section id="voice" title="Voice" lede="Press a voice to hear it. These are built into your device: free, nothing to download.">
            <VoicePicker />
          </Section>

          <Section id="accessibility" title="Accessibility" lede="Make Forma easier to read and calmer to use.">
            <p className="mb-3 text-[13px] font-medium">Text size</p>
            <div role="radiogroup" aria-label="Text size" className="grid max-w-[460px] grid-cols-3 gap-3">
              {(
                [
                  ["md", "Default", "text-[15px]"],
                  ["lg", "Large", "text-[18px]"],
                  ["xl", "Larger", "text-[21px]"],
                ] as const
              ).map(([id, label, size]) => (
                <PressTile key={id} size="md" label={label} selected={appearance.text === id} onClick={() => a11y({ text: id })}>
                  <span className={cn("font-semibold text-fg", size)} aria-hidden>
                    Aa
                  </span>
                </PressTile>
              ))}
            </div>
            <div className="mt-6 flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
              <Toggle
                label="Reduce motion"
                hint="Swap movement for gentle fades, everywhere in Forma."
                checked={appearance.motion === "reduce"}
                onChange={(v) => a11y({ motion: v ? "reduce" : "system" })}
              />
              <Toggle
                label="Higher contrast"
                hint="Darker secondary text and stronger outlines."
                checked={appearance.contrast === "high"}
                onChange={(v) => a11y({ contrast: v ? "high" : "normal" })}
              />
              <Toggle
                label="Readable spacing"
                hint="More space between letters, words and lines. Helpful with dyslexia."
                checked={appearance.spacing === "wide"}
                onChange={(v) => a11y({ spacing: v ? "wide" : "normal" })}
              />
              <Toggle
                label="Underline links"
                hint="Make every link easy to spot."
                checked={appearance.links === "underline"}
                onChange={(v) => a11y({ links: v ? "underline" : "normal" })}
              />
            </div>
          </Section>

          <Section id="connections" title="Connections" lede="Bring in deadlines from school and calendar apps so plans fit around them.">
            <ConnectionsSection initial={connections} />
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ id, title, lede, children }: { id: string; title: string; lede: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-8"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: ease.expo }}
    >
      <h2 id={`${id}-title`} className="text-[19px] font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mb-5 mt-1 text-[14px] text-fg-muted">{lede}</p>
      {children}
    </motion.section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div>
        <p className="text-[14px] text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </div>
  );
}
