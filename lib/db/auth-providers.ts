import "server-only";
import { isSupabaseConfigured, supabaseEnv } from "./env";

export type OAuthProvider = "google" | "azure";
export type AuthProviders = Record<OAuthProvider, boolean>;

/**
 * Which social sign-ins are switched on in Supabase (Authentication →
 * Providers). Read from the public auth settings so the login page never
 * sends anyone to a provider that isn't set up.
 */
export async function getAuthProviders(): Promise<AuthProviders> {
  const none = { google: false, azure: false };
  if (!isSupabaseConfigured()) return none;
  try {
    const res = await fetch(`${supabaseEnv.url}/auth/v1/settings`, {
      headers: { apikey: supabaseEnv.key },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return none;
    const data = (await res.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(data.external?.google), azure: Boolean(data.external?.azure) };
  } catch {
    return none;
  }
}
