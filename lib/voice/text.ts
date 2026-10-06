/**
 * Pure helpers for speech: what to say and which voices to offer. Kept free
 * of browser APIs so they can be unit tested.
 */

/** The fields of SpeechSynthesisVoice the app relies on. */
export type VoiceLike = {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
};

/** Markdown and symbols read badly aloud; reduce a reply to plain sentences. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[·•→←]/g, ", ")
    .replace(/([.!?:;,])\s*\n+\s*/g, "$1 ")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/([.!?])(\s*\.)+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Split text into sentence-sized chunks. Some browsers stop speaking long
 * utterances partway through, so each chunk is spoken separately.
 */
export function splitForSpeech(text: string, max = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim());
      current = "";
    }
    if (sentence.length > max) {
      // A run-on sentence: break at commas or spaces.
      for (const part of sentence.split(/(?<=,)\s+/)) {
        if ((current + part).length > max && current) {
          chunks.push(current.trim());
          current = "";
        }
        current += `${part} `;
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const QUALITY = [
  { pattern: /natural|neural/i, score: 6 },
  { pattern: /premium|enhanced/i, score: 5 },
  { pattern: /google/i, score: 3 },
  { pattern: /\b(samantha|daniel|karen|moira|tessa|serena|ava|allison|evan|nathan|zoe)\b/i, score: 2 },
];
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;

/** Voices for the person's language, most natural-sounding first. */
export function rankVoices<T extends VoiceLike>(voices: readonly T[], language: string): T[] {
  const base = language.toLowerCase().split("-")[0];
  const scored = voices
    .filter((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === base && !NOVELTY.test(v.name))
    .map((v) => {
      let score = QUALITY.reduce((s, q) => (q.pattern.test(v.name) ? s + q.score : s), 0);
      if (v.lang.toLowerCase().replace("_", "-") === language.toLowerCase()) score += 2;
      if (v.default) score += 1;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name));
  // Several engines list the same voice twice; keep the best-ranked one.
  const seen = new Set<string>();
  return scored
    .filter(({ v }) => {
      const key = voiceDisplay(v).name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ v }) => v);
}

/** A friendly name ("Aria") and detail ("English (US) · Natural") for a voice. */
export function voiceDisplay(voice: Pick<VoiceLike, "name" | "lang">): { name: string; detail: string } {
  const natural = /natural|neural|premium|enhanced/i.test(voice.name);
  const name =
    voice.name
      .replace(/^(Microsoft|Google|Apple)\s+/i, "")
      .replace(/\s*\((Natural|Enhanced|Premium)\)/gi, "")
      .replace(/\s+Online/i, "")
      .replace(/\s*[-–]\s*.*$/, "")
      .replace(/\s*\(.*\)$/, "")
      .trim() || voice.name;
  let region = voice.lang;
  try {
    region = new Intl.DisplayNames(["en"], { type: "language" }).of(voice.lang.replace("_", "-")) ?? voice.lang;
  } catch {}
  return { name, detail: natural ? `${region} · Natural` : region };
}
