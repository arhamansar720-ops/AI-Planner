"use client";

import { useSyncExternalStore } from "react";
import { APPEARANCE_ATTRS, APPEARANCE_KEY, DEFAULT_APPEARANCE, type Appearance } from "@/lib/appearance";

export { PALETTES, type Appearance, type PaletteId } from "@/lib/appearance";

/** The person's color theme and accessibility choices, kept on this device. */
let cache: Appearance | null = null;
const listeners = new Set<() => void>();

export function getAppearance(): Appearance {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_APPEARANCE, ...(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "{}") as Partial<Appearance>) };
  } catch {
    cache = DEFAULT_APPEARANCE;
  }
  return cache;
}

function apply(a: Appearance) {
  const root = document.documentElement;
  for (const k of APPEARANCE_ATTRS) {
    if (a[k] === DEFAULT_APPEARANCE[k]) root.removeAttribute(`data-${k}`);
    else root.setAttribute(`data-${k}`, a[k]);
  }
}

export function setAppearance(patch: Partial<Appearance>) {
  cache = { ...getAppearance(), ...patch };
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(cache));
  } catch {}
  apply(cache);
  listeners.forEach((l) => l());
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getAppearance,
    () => DEFAULT_APPEARANCE,
  );
}
