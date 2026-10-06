"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Speech-to-text with the browser's built-in recognizer (Web Speech API).
 * Where the browser can recognize speech on the device it is asked to;
 * otherwise the browser uses its own speech service.
 */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = (new () => Recognition) & {
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
/** Whether this browser can take dictation (false during server rendering). */
export function useDictationSupported() {
  return useSyncExternalStore(noop, () => getCtor() !== null, () => false);
}

export type DictationError = "denied" | "no-speech" | "failed";

/**
 * `onText` receives everything heard in this session so far (final plus the
 * in-progress guess), so callers can show it live and keep the last value.
 */
export function useDictation(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<DictationError | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(async () => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    setError(null);
    const lang = navigator.language || "en-US";
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    try {
      // Newer browsers can recognize speech without leaving the device.
      if (Ctor.available && "processLocally" in rec) {
        const status = await Ctor.available({ langs: [lang], processLocally: true });
        if (status === "available") rec.processLocally = true;
      }
    } catch {}

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const text = (finalText + interim).replace(/\s+/g, " ").trim();
      onTextRef.current(text, !interim);
    };
    rec.onerror = (e) => {
      setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" ? "no-speech" : e.error === "aborted" ? null : "failed");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setError("failed");
    }
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { listening, error, start, stop };
}
