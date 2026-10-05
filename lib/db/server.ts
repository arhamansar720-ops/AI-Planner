import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isSupabaseConfigured, supabaseEnv } from "./env";

/** Supabase client bound to the current request's auth cookies. */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServer>>;

/** The authenticated user for this request, verified with Supabase Auth. */
export const getSession = cache(async (): Promise<{ supabase: ServerSupabase; user: User | null }> => {
  await connection(); // always per-request, never prerendered
  // Without a database there is nothing to show; the login page explains the setup.
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
});
