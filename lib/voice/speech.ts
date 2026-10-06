"use client";

import { useSyncExternalStore } from "react";
import { cleanForSpeech, rankVoices, splitForSpeech } from "./text";

/**
 * Text-to-speech with the voices built into the browser and operating
 * system (the Web Speech API): free, no account and nothing to download.
 * Voice choices are kept per device, because each device has its own voices.
 */

export type VoiceSettings = {
  /** Speaker buttons and spoken replies are available. */
  enabled: boolean;
  /** null = the system default voice. */
  voiceURI: string | null;
  rate: number;
  pitch: number;
  /** Read assistant replies and finished plans aloud automatically. */
  autoRead: boolean;
};

const KEY = "forma:voice";
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = { enabled: true, voiceURI: null, rate: 1, pitch: 1, autoRead: false };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* Settings ------------------------------------------------------------------ */

let settingsCache: VoiceSettings | null = null;

export function getVoiceSettings(): VoiceSettings {
  if (settingsCache) return settingsCache;
  try {
    const raw = localStorage.getItem(KEY);
    settingsCache = raw ? { ...DEFAULT_VOICE_SETTINGS, ...(JSON.parse(raw) as Partial<VoiceSettings>) } : DEFAULT_VOICE_SETTINGS;
  } catch {
    settingsCache = DEFAULT_VOICE_SETTINGS;
  }
  return settingsCache;
}

export function setVoiceSettings(patch: Partial<VoiceSettings>) {
  settingsCache = { ...getVoiceSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settingsCache));
  } catch {}
  emit();
}

export function useVoiceSettings(): VoiceSettings {
  return useSyncExternalStore(subscribe, getVoiceSettings, () => DEFAULT_VOICE_SETTINGS);
}

/* Voices -------------------------------------------------------------------- */

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

const NO_VOICES: SpeechSynthesisVoice[] = [];
let voicesCache: SpeechSynthesisVoice[] = NO_VOICES;
let voicesHooked = false;

function readVoices() {
  const all = window.speechSynthesis.getVoices();
  const lang = navigator.language || "en-US";
  const ranked = rankVoices(all, lang);
  // Fall back to English, then anything, when the language has no voices.
  voicesCache = ranked.length ? ranked : rankVoices(all, "en-US").length ? rankVoices(all, "en-US") : all.slice();
  emit();
}

function subscribeVoices(listener: () => void) {
  if (speechSupported() && !voicesHooked) {
    voicesHooked = true;
    window.speechSynthesis.addEventListener("voiceschanged", readVoices);
    readVoices();
  }
  return subscribe(listener);
}

/** Voices for the visitor's language, best first. Empty until the browser loads them. */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, () => voicesCache, () => NO_VOICES);
}

function resolveVoice(uri: string | null): SpeechSynthesisVoice | null {
  if (!uri) return voicesCache[0] ?? null;
  return window.speechSynthesis.getVoices().find((v) => v.voiceURI === uri) ?? voicesCache[0] ?? null;
}

/* Speaking ------------------------------------------------------------------ */

let speakingId: string | null = null;
let run = 0;

function setSpeaking(id: string | null) {
  speakingId = id;
  emit();
}

/** The id passed to speak() for what is being spoken now, if anything. */
export function useSpeakingId(): string | null {
  return useSyncExternalStore(subscribe, () => speakingId, () => null);
}

/**
 * Speak text (markdown is fine), replacing anything already being spoken.
 * `overrides` lets setup preview a voice before it is saved.
 */
export function speak(text: string, options: { id?: string; overrides?: Partial<VoiceSettings> } = {}) {
  if (!speechSupported()) return;
  const settings = { ...getVoiceSettings(), ...options.overrides };
  const synth = window.speechSynthesis;
  synth.cancel();
  const current = ++run;
  const chunks = splitForSpeech(cleanForSpeech(text));
  if (!chunks.length) return;
  const voice = resolveVoice(settings.voiceURI);
  const id = options.id ?? "speech";
  setSpeaking(id);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = settings.rate;
    u.pitch = settings.pitch;
    if (i === chunks.length - 1) {
      u.onend = () => current === run && setSpeaking(null);
    }
    u.onerror = () => current === run && setSpeaking(null);
    synth.speak(u);
  });
}

export function stopSpeaking() {
  run++;
  if (speechSupported()) window.speechSynthesis.cancel();
  setSpeaking(null);
}

/** Speak only if the person turned on automatic reading. */
export function speakIfAutoRead(text: string, id?: string) {
  const s = getVoiceSettings();
  if (s.enabled && s.autoRead) speak(text, { id });
}
