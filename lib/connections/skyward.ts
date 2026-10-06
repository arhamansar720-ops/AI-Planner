"use client";

/** Skyward has no feed: a pasted copy of the assignments page, kept on this device. */
const KEY = "forma:skyward";
export const SKYWARD_MAX = 30_000;

export type SkywardSnapshot = { text: string; savedAt: string };

export function readSkywardSnapshot(): SkywardSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SkywardSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveSkywardSnapshot(text: string) {
  const snapshot = { text: text.slice(0, SKYWARD_MAX), savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function clearSkywardSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
