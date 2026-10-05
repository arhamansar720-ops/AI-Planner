"use client";

import { useEffect, useState } from "react";

/** The current theme's accent as an [r, g, b] triple in 0–1, for WebGL. */
export function useAccentRGB(): [number, number, number] | null {
  const [rgb, setRgb] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    const read = () => {
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      document.body.appendChild(probe);
      const match = getComputedStyle(probe).color.match(/[\d.]+/g);
      probe.remove();
      if (match && match.length >= 3) setRgb([+match[0] / 255, +match[1] / 255, +match[2] / 255]);
    };
    read();
    // The theme is a class on <html>; follow it.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return rgb;
}
