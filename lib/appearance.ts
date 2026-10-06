/**
 * Color themes and accessibility options. Shared by the server layout (the
 * pre-paint script) and the client store in components/shell/appearance.ts.
 */

export type Theme = "light" | "dark" | "system";
export const THEME_KEY = "forma-theme";

/** Runs before paint to avoid a flash of the wrong light/dark theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export const PALETTES = [
  { id: "cobalt", label: "Cobalt", swatch: ["#f6f6f4", "#3657d1"], dark: ["#0b0b0d", "#7d95ff"] },
  { id: "pink", label: "Pastel pink", swatch: ["#fdf4f7", "#c2416f"], dark: ["#140c10", "#ff9cc6"] },
  { id: "blue", label: "Baby blue", swatch: ["#f1f7fd", "#2b6cb0"], dark: ["#0a0f16", "#8cc2ff"] },
  { id: "mint", label: "Mint", swatch: ["#f1f9f5", "#1b7a55"], dark: ["#09120e", "#6fdcae"] },
  { id: "lavender", label: "Lavender", swatch: ["#f6f4fd", "#6a4bd1"], dark: ["#0f0c18", "#b6a4ff"] },
  { id: "peach", label: "Peach", swatch: ["#fdf6f0", "#b8521f"], dark: ["#140e0a", "#ffae80"] },
  { id: "mono", label: "Graphite", swatch: ["#f5f5f4", "#18181b"], dark: ["#0b0b0d", "#f4f4f5"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export type Appearance = {
  palette: PaletteId;
  text: "md" | "lg" | "xl";
  contrast: "normal" | "high";
  motion: "system" | "reduce";
  spacing: "normal" | "wide";
  links: "normal" | "underline";
};

export const DEFAULT_APPEARANCE: Appearance = {
  palette: "cobalt",
  text: "md",
  contrast: "normal",
  motion: "system",
  spacing: "normal",
  links: "normal",
};

export const APPEARANCE_KEY = "forma-appearance";
export const APPEARANCE_ATTRS = ["palette", "text", "contrast", "motion", "spacing", "links"] as const;

/** Runs before paint (in the root layout) so pages never flash the wrong colors. */
export const appearanceScript = `(function(){try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}");var r=document.documentElement;${APPEARANCE_ATTRS.map(
  (k) => `if(a.${k})r.setAttribute("data-${k}",a.${k});`,
).join("")}}catch(e){}})();`;
