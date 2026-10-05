"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  client ??= createBrowserClient(supabaseEnv.url, supabaseEnv.key);
  return client;
}
