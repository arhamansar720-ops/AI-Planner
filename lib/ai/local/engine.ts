"use client";

import type { ChatCompletionMessageParam, MLCEngineInterface } from "@mlc-ai/web-llm";
import { useSyncExternalStore } from "react";
import { LOCAL_MODEL } from "@/lib/config";
import { resolveModel, type GpuCapabilities, type ModelChoice } from "./models";

/**
 * The on-device language model. One engine per tab, running in a Web
 * Worker, loaded on first use and cached by the browser afterwards.
 */

export type EngineState =
  | { status: "checking" }
  | { status: "unsupported"; reason: string }
  | { status: "idle"; cached: boolean }
  | { status: "loading"; progress: number; text: string; cached: boolean }
  | { status: "ready" }
  | { status: "error"; message: string };

export type ChatMessage = ChatCompletionMessageParam;

/** Must equal the installed @mlc-ai/web-llm version (checked by a unit test). */
export const WEBLLM_VERSION = "0.2.85";

/**
 * The model runs in a module worker so token generation never blocks the
 * interface. The worker imports the same pinned WebLLM build from jsDelivr,
 * which keeps it independent of the app bundler.
 */
function createWorker(): Worker {
  const source = `import { WebWorkerMLCEngineHandler } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm";
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message) => handler.onmessage(message);`;
  return new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })), { type: "module" });
}

/** Minimal surface the app needs; also what a test harness can provide. */
type Engine = Pick<MLCEngineInterface, "chat" | "interruptGenerate">;

let state: EngineState = { status: "checking" };
const listeners = new Set<() => void>();
let enginePromise: Promise<Engine> | null = null;
let loadedModelId: string | null = null;
let worker: Worker | null = null;
let checked = false;
let capabilities: GpuCapabilities | null = null;

/* Model choice ------------------------------------------------------------- */

const CHOICE_KEY = "forma:model";

function readChoice(): ModelChoice {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    if (v === "best" || v === "balanced" || v === "light" || v === "auto") return v;
  } catch {}
  return "auto";
}

export type ActiveModel = ReturnType<typeof resolveModel> & { choice: ModelChoice; recommended: ReturnType<typeof resolveModel> };

let activeCache: ActiveModel | null = null;
function computeActive(): ActiveModel {
  const choice = typeof window === "undefined" ? "auto" : readChoice();
  return {
    ...resolveModel(choice, capabilities, LOCAL_MODEL.overrideId),
    choice,
    recommended: resolveModel("auto", capabilities, LOCAL_MODEL.overrideId),
  };
}

/** The model this device will use, given the person's choice and its graphics chip. */
export function getActiveModel(): ActiveModel {
  return (activeCache ??= computeActive());
}

const SERVER_ACTIVE = resolveModel("auto", null, LOCAL_MODEL.overrideId);
const SERVER_MODEL: ActiveModel = { ...SERVER_ACTIVE, choice: "auto", recommended: SERVER_ACTIVE };

export function useActiveModel(): ActiveModel {
  return useSyncExternalStore(subscribeEngine, getActiveModel, () => SERVER_MODEL);
}

/** Switch model size. A loaded engine is released; the new model loads on next use. */
export async function setModelChoice(choice: ModelChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {}
  activeCache = null;
  const next = getActiveModel();
  if (loadedModelId && loadedModelId !== next.id) unload();
  if (state.status === "unsupported" || state.status === "loading") return set(state);
  if (!(state.status === "ready" && loadedModelId === next.id)) {
    const { hasModelInCache } = await import("@mlc-ai/web-llm");
    const cached = await hasModelInCache(next.id).catch(() => false);
    set({ status: "idle", cached });
  } else set(state);
}

function unload() {
  const old = enginePromise;
  enginePromise = null;
  loadedModelId = null;
  void old?.then((e) => (e as Engine & { unload?: () => Promise<void> }).unload?.()).catch(() => {});
  worker?.terminate();
  worker = null;
}

function set(next: EngineState) {
  state = next;
  activeCache = null;
  listeners.forEach((l) => l());
}

export function subscribeEngine(listener: () => void) {
  listeners.add(listener);
  if (!checked) {
    checked = true;
    void check();
  }
  return () => listeners.delete(listener);
}

export function getEngineState() {
  return state;
}

const SERVER_STATE: EngineState = { status: "checking" };
export function getServerEngineState() {
  return SERVER_STATE;
}

export function useEngineState() {
  return useSyncExternalStore(subscribeEngine, getEngineState, getServerEngineState);
}

/** A test harness may provide an engine on window.__formaEngine. */
function injected(): Engine | null {
  return (globalThis as { __formaEngine?: Engine }).__formaEngine ?? null;
}

async function check() {
  if (injected()) return set({ status: "ready" });
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) {
    return set({
      status: "unsupported",
      reason: "This browser can’t run the on-device AI. Use Chrome or Edge on a computer.",
    });
  }
  try {
    const adapter = (await gpu.requestAdapter()) as GpuAdapterLike | null;
    if (!adapter) {
      return set({ status: "unsupported", reason: "This device’s graphics chip can’t run the on-device AI." });
    }
    capabilities = readCapabilities(adapter);
    activeCache = null;
    const { hasModelInCache } = await import("@mlc-ai/web-llm");
    const cached = await hasModelInCache(getActiveModel().id).catch(() => false);
    if (state.status === "checking") set({ status: "idle", cached });
  } catch {
    set({ status: "idle", cached: false });
  }
}

type GpuAdapterLike = {
  features: { has(name: string): boolean };
  limits: { maxBufferSize?: number };
  info?: { vendor?: string; architecture?: string; isFallbackAdapter?: boolean };
  isFallbackAdapter?: boolean;
};

function readCapabilities(adapter: GpuAdapterLike): GpuCapabilities {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return {
    f16: adapter.features.has("shader-f16"),
    vendor: adapter.info?.vendor ?? "",
    architecture: adapter.info?.architecture ?? "",
    isFallback: Boolean(adapter.info?.isFallbackAdapter ?? adapter.isFallbackAdapter),
    deviceMemoryGB: typeof memory === "number" ? memory : null,
    maxBufferSize: adapter.limits.maxBufferSize ?? 0,
  };
}

/** Load (downloading the first time) and return the engine. */
export function loadEngine(): Promise<Engine> {
  const fake = injected();
  if (fake) return Promise.resolve(fake);
  if (state.status === "unsupported") return Promise.reject(new Error(state.reason));
  if (enginePromise) return enginePromise;

  const model = getActiveModel();
  const cached = state.status === "idle" ? state.cached : false;
  set({ status: "loading", progress: 0, text: "", cached });
  enginePromise = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    const config = {
      initProgressCallback: (report: { progress: number; text: string }) =>
        set({ status: "loading", progress: report.progress, text: report.text, cached }),
    };
    const chatOptions = { context_window_size: LOCAL_MODEL.contextWindow };

    let engine: Engine;
    try {
      worker = createWorker();
      const failed = new Promise<never>((_, reject) => {
        worker!.addEventListener("error", (e) => reject(new Error(`worker: ${e.message || "failed to start"}`)), { once: true });
      });
      engine = await Promise.race([webllm.CreateWebWorkerMLCEngine(worker, model.id, config, chatOptions), failed]);
    } catch (error) {
      if (!String((error as Error)?.message ?? "").startsWith("worker:")) throw error;
      // The worker couldn't load (e.g. the CDN is blocked): run on the page instead.
      console.warn("[local-model] worker unavailable, running on the main thread", error);
      worker?.terminate();
      worker = null;
      engine = await webllm.CreateMLCEngine(model.id, config, chatOptions);
    }
    loadedModelId = model.id;
    set({ status: "ready" });
    return engine;
  })().catch((error: unknown) => {
    enginePromise = null;
    const message = String((error as Error)?.message ?? error);
    console.error("[local-model] failed to load", error);
    set({
      status: "error",
      message: /memory|OOM|allocate|buffer/i.test(message)
        ? model.tier === "light"
          ? "This device doesn’t have enough graphics memory for the on-device AI."
          : "This device doesn’t have enough graphics memory for this model. Choose a lighter one in Settings → AI."
        : "The on-device AI couldn’t start. Check your connection and try again.",
    });
    throw error;
  });
  return enginePromise;
}

/** Remove the downloaded model from this browser. */
export async function removeCachedModel() {
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  const id = getActiveModel().id;
  unload();
  await deleteModelAllInfoInCache(id);
  set({ status: "idle", cached: false });
}

const SAMPLING = { temperature: 0.7, top_p: 0.8 } as const;

/** Stream a completion as text deltas. Thinking mode is off for speed. */
export async function* streamChat(
  messages: ChatMessage[],
  options: { maxTokens: number; signal?: AbortSignal },
): AsyncGenerator<string> {
  const engine = await loadEngine();
  const onAbort = () => engine.interruptGenerate();
  options.signal?.addEventListener("abort", onAbort);
  try {
    const chunks = await engine.chat.completions.create({
      messages,
      stream: true,
      max_tokens: options.maxTokens,
      ...SAMPLING,
      extra_body: { enable_thinking: false },
    });
    for await (const chunk of chunks) {
      if (options.signal?.aborted) return;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** One JSON object, constrained to `schema` by the engine's grammar support. */
export async function completeJSON(messages: ChatMessage[], schema: object, maxTokens: number): Promise<unknown> {
  const engine = await loadEngine();
  const reply = await engine.chat.completions.create({
    messages,
    stream: false,
    max_tokens: maxTokens,
    ...SAMPLING,
    response_format: { type: "json_object", schema: JSON.stringify(schema) },
    extra_body: { enable_thinking: false },
  });
  return JSON.parse(reply.choices[0]?.message?.content ?? "");
}
