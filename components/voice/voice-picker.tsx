"use client";

import { ChevronDown, Volume2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Segmented, Switch } from "@/components/ui/controls";
import { PressTile } from "@/components/ui/press-tile";
import { useDictationSupported } from "@/lib/voice/dictation";
import { setVoiceSettings, speak, speechSupported, stopSpeaking, useVoices, useVoiceSettings } from "@/lib/voice/speech";
import { voiceDisplay } from "@/lib/voice/text";

const VOICE_EMOJI = ["🎙️", "🎧", "📻", "🌤️", "🌙", "🌊", "🎵", "🍃"];
const SPEEDS = [
  { value: "0.85", label: "Relaxed" },
  { value: "1", label: "Normal" },
  { value: "1.2", label: "Brisk" },
] as const;

const noop = () => () => {};

export function previewLine(name: string) {
  return `Hi, I'm ${name}. Tell me what you want to get done, and I'll turn it into a plan.`;
}

/** Pick a voice by pressing it (each press plays a preview), plus speed and auto-read. */
export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const supported = useSyncExternalStore(noop, speechSupported, () => false);
  const dictation = useDictationSupported();
  const voices = useVoices();
  const settings = useVoiceSettings();
  const [showAll, setShowAll] = useState(false);

  if (!supported) {
    return <p className="text-[14px] text-fg-muted">This browser doesn’t have built-in voices. Chrome, Edge and Safari do.</p>;
  }

  const current = settings.enabled ? (settings.voiceURI ?? voices[0]?.voiceURI ?? null) : null;
  const visible = showAll ? voices.slice(0, 40) : voices.slice(0, compact ? 5 : 7);
  const speed = SPEEDS.reduce((best, s) => (Math.abs(Number(s.value) - settings.rate) < Math.abs(Number(best.value) - settings.rate) ? s : best)).value;

  const choose = (voice: SpeechSynthesisVoice) => {
    setVoiceSettings({ enabled: true, voiceURI: voice.voiceURI });
    speak(previewLine(voiceDisplay(voice).name), { id: "preview", overrides: { enabled: true, voiceURI: voice.voiceURI } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Voice" className="grid gap-3 sm:grid-cols-2">
        <PressTile
          size="md"
          emoji="🔇"
          label="No voice"
          hint="Keep Forma quiet"
          selected={!settings.enabled}
          onClick={() => {
            stopSpeaking();
            setVoiceSettings({ enabled: false, autoRead: false });
          }}
        />
        {voices.length === 0 && (
          <p className="flex items-center px-2 text-[13px] text-fg-subtle">Loading your device’s voices…</p>
        )}
        {visible.map((v, i) => {
          const d = voiceDisplay(v);
          return (
            <PressTile
              key={v.voiceURI}
              size="md"
              emoji={VOICE_EMOJI[i % VOICE_EMOJI.length]}
              label={d.name}
              hint={d.detail}
              selected={current === v.voiceURI}
              onClick={() => choose(v)}
            />
          );
        })}
      </div>
      {voices.length > visible.length || showAll ? (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="-mt-2 inline-flex items-center gap-1 self-start text-[13px] text-fg-muted hover:text-fg"
        >
          <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Fewer voices" : `All ${voices.length} voices`}
        </button>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4" aria-disabled={!settings.enabled}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] text-fg">Speaking speed</p>
            <p className="text-xs text-fg-subtle">How quickly replies are read</p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              label="Speaking speed"
              size="sm"
              value={speed}
              onChange={(v) => {
                setVoiceSettings({ rate: Number(v) });
                speak("This is how fast I'll talk.", { id: "preview", overrides: { enabled: true, rate: Number(v) } });
              }}
              options={SPEEDS}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Hear the voice"
              disabled={!settings.enabled}
              onClick={() => {
                const v = voices.find((x) => x.voiceURI === current) ?? voices[0];
                if (v) speak(previewLine(voiceDisplay(v).name), { id: "preview" });
              }}
            >
              <Volume2 />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[14px] text-fg">Read replies aloud</p>
            <p className="text-xs text-fg-subtle">The assistant speaks its answers, and new plans are announced.</p>
          </div>
          <Switch
            checked={settings.enabled && settings.autoRead}
            onCheckedChange={(v) => setVoiceSettings({ autoRead: v, enabled: v ? true : settings.enabled })}
            label="Read replies aloud"
          />
        </div>
        {dictation && (
          <p className="border-t border-border pt-4 text-xs text-fg-subtle">
            You can also talk to Forma: tap the mic in the prompt box or the assistant to dictate.
          </p>
        )}
      </div>
    </div>
  );
}
