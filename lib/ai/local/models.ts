/**
 * The on-device model comes in three sizes. "Auto" picks one from what the
 * visitor's graphics chip reports, and every size has a 32-bit variant for
 * chips without 16-bit shader support (WebGPU's "shader-f16"), which the
 * smaller default builds require.
 */

export const MODEL_TIERS = [
  {
    id: "best",
    emoji: "🧠",
    label: "Best",
    name: "Qwen3 8B",
    f16: "Qwen3-8B-q4f16_1-MLC",
    f32: "Qwen3-8B-q4f32_1-MLC",
    download: "about 4.5 GB",
    blurb: "The most thorough plans. Needs a dedicated graphics card with 6 GB or more.",
  },
  {
    id: "balanced",
    emoji: "⚖️",
    label: "Balanced",
    name: "Qwen3 4B",
    f16: "Qwen3-4B-q4f16_1-MLC",
    f32: "Qwen3-4B-q4f32_1-MLC",
    download: "about 2.3 GB",
    blurb: "Strong plans on most recent laptops.",
  },
  {
    id: "light",
    emoji: "🪶",
    label: "Light",
    name: "Qwen3 1.7B",
    f16: "Qwen3-1.7B-q4f16_1-MLC",
    f32: "Qwen3-1.7B-q4f32_1-MLC",
    download: "about 1 GB",
    blurb: "Quickest to download and run. Simpler plans, for older or low-memory computers.",
  },
] as const;

export type ModelTierId = (typeof MODEL_TIERS)[number]["id"];
export type ModelChoice = ModelTierId | "auto";

/** What the browser tells us about the graphics chip. */
export type GpuCapabilities = {
  f16: boolean;
  vendor: string;
  architecture: string;
  isFallback: boolean;
  /** navigator.deviceMemory in GB (Chrome reports at most 8), when available. */
  deviceMemoryGB: number | null;
  maxBufferSize: number;
};

/**
 * A conservative guess: the 8B model only for discrete-class NVIDIA/AMD
 * chips on well-equipped machines, the 1.7B model for software rendering or
 * low-memory devices, and the 4B model otherwise.
 */
export function recommendTier(caps: GpuCapabilities | null): ModelTierId {
  if (!caps) return "balanced";
  if (caps.isFallback) return "light";
  if (caps.deviceMemoryGB !== null && caps.deviceMemoryGB <= 4) return "light";
  const vendor = caps.vendor.toLowerCase();
  const discrete = /nvidia|amd|ati/.test(vendor) && !/integrated|apu|igpu/i.test(caps.architecture);
  const roomy = caps.deviceMemoryGB === null || caps.deviceMemoryGB >= 8;
  if (discrete && roomy && caps.maxBufferSize >= 2 ** 31) return "best";
  return "balanced";
}

export function getTier(id: ModelTierId) {
  return MODEL_TIERS.find((t) => t.id === id) ?? MODEL_TIERS[1];
}

/** The concrete WebLLM model id for a choice on this device. */
export function resolveModel(
  choice: ModelChoice,
  caps: GpuCapabilities | null,
  overrideId?: string | null,
): { tier: ModelTierId; id: string; name: string; download: string; auto: boolean } {
  const tierId = choice === "auto" ? recommendTier(caps) : choice;
  const tier = getTier(tierId);
  if (overrideId) {
    return { tier: tierId, id: overrideId, name: overrideId.replace(/-q\d.*$/, "").replace(/-/g, " "), download: "a one-time download", auto: false };
  }
  const f16 = caps ? caps.f16 : true;
  return { tier: tier.id, id: f16 ? tier.f16 : tier.f32, name: tier.name, download: tier.download, auto: choice === "auto" };
}
