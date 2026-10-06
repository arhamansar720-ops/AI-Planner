import assert from "node:assert/strict";
import { test } from "node:test";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { MODEL_TIERS, recommendTier, resolveModel, type GpuCapabilities } from "@/lib/ai/local/models";

const caps = (over: Partial<GpuCapabilities>): GpuCapabilities => ({
  f16: true,
  vendor: "",
  architecture: "",
  isFallback: false,
  deviceMemoryGB: 8,
  maxBufferSize: 2 ** 32,
  ...over,
});

test("every model size exists in the installed WebLLM, in 16- and 32-bit builds", () => {
  const ids = new Set(prebuiltAppConfig.model_list.map((m) => m.model_id));
  for (const t of MODEL_TIERS) {
    assert.ok(ids.has(t.f16), t.f16);
    assert.ok(ids.has(t.f32), t.f32);
  }
});

test("auto picks a size the device can likely run", () => {
  assert.equal(recommendTier(caps({ vendor: "nvidia", architecture: "ampere" })), "best");
  assert.equal(recommendTier(caps({ vendor: "amd", architecture: "rdna-3" })), "best");
  assert.equal(recommendTier(caps({ vendor: "apple", architecture: "metal-3" })), "balanced");
  assert.equal(recommendTier(caps({ vendor: "intel", architecture: "gen-12lp" })), "balanced");
  assert.equal(recommendTier(caps({ vendor: "nvidia", deviceMemoryGB: 4 })), "light");
  assert.equal(recommendTier(caps({ isFallback: true, vendor: "nvidia" })), "light");
  assert.equal(recommendTier(null), "balanced");
});

test("chips without 16-bit shaders get the 32-bit build; an explicit choice wins", () => {
  assert.equal(resolveModel("auto", caps({ vendor: "intel", f16: false })).id, "Qwen3-4B-q4f32_1-MLC");
  assert.equal(resolveModel("light", caps({ vendor: "nvidia" })).id, "Qwen3-1.7B-q4f16_1-MLC");
  assert.equal(resolveModel("best", caps({ f16: false })).id, "Qwen3-8B-q4f32_1-MLC");
  assert.equal(resolveModel("auto", null, "Llama-3.2-3B-Instruct-q4f16_1-MLC").id, "Llama-3.2-3B-Instruct-q4f16_1-MLC");
});
