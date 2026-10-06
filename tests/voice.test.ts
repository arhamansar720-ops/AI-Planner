import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlannerUserMessage, type PlannerPreferences } from "@/lib/ai/prompts";
import { cleanForSpeech, rankVoices, splitForSpeech, voiceDisplay, type VoiceLike } from "@/lib/voice/text";

const voice = (name: string, lang = "en-US", extra: Partial<VoiceLike> = {}): VoiceLike => ({
  voiceURI: name,
  name,
  lang,
  localService: true,
  default: false,
  ...extra,
});

test("cleanForSpeech turns markdown into speakable sentences", () => {
  const out = cleanForSpeech("**Done.** Here’s today:\n\n- Draft the outline\n- Read [chapter 2](https://x.y)\n\n`code`");
  assert.equal(out, "Done. Here’s today: Draft the outline. Read chapter 2. code");
  assert.ok(!/[*`[\]#]/.test(cleanForSpeech("## Title\n1. *one*")));
});

test("splitForSpeech keeps chunks short without losing words", () => {
  const text = "One sentence. ".repeat(40) + "A very long run-on clause, ".repeat(12);
  const chunks = splitForSpeech(text, 120);
  assert.ok(chunks.every((c) => c.length <= 160));
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").trim(), text.replace(/\s+/g, " ").trim());
});

test("rankVoices prefers natural voices in the visitor's language and drops novelty ones", () => {
  const ranked = rankVoices(
    [
      voice("Albert"),
      voice("Fred"),
      voice("Microsoft Aria Online (Natural) - English (United States)"),
      voice("Google UK English Female", "en-GB"),
      voice("Thomas", "fr-FR"),
    ],
    "en-US",
  );
  assert.deepEqual(
    ranked.map((v) => v.name),
    ["Microsoft Aria Online (Natural) - English (United States)", "Google UK English Female", "Fred"],
  );
});

test("voiceDisplay gives a friendly name", () => {
  assert.equal(voiceDisplay(voice("Microsoft Aria Online (Natural) - English (United States)")).name, "Aria");
  assert.match(voiceDisplay(voice("Microsoft Aria Online (Natural) - English (United States)")).detail, /Natural/);
  assert.equal(voiceDisplay(voice("Samantha")).name, "Samantha");
});

test("the planner prompt carries the person's mode", () => {
  const base: PlannerPreferences = { planningStyle: "balanced", defaultDurationWeeks: null, dailyMinutes: 60, blockedWeekdays: [], responseStyle: "concise" };
  const msg = buildPlannerUserMessage({ prompt: "Pass calculus", today: "2026-10-06", context: [], preferences: { ...base, persona: "student" } });
  assert.match(msg, /About the person: The person is a student/);
  const none = buildPlannerUserMessage({ prompt: "Pass calculus", today: "2026-10-06", context: [], preferences: base });
  assert.doesNotMatch(none, /About the person/);
});
