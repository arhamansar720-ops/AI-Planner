import "server-only";
import type { User } from "@supabase/supabase-js";
import type { NavUser } from "@/components/shell/top-nav";
import { getPersona, type PersonaId } from "@/lib/personas";
import type { ServerSupabase } from "./server";

export async function getNavUser(supabase: ServerSupabase, user: User | null): Promise<NavUser> {
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const email = user.email ?? "";
  return { email, name: data?.display_name || email.split("@")[0] || "You" };
}

/** Setup choices kept in the account's user metadata (no table needed). */
export function getAccountSetup(user: User | null): { persona: PersonaId | null; onboarded: boolean } {
  const meta = (user?.user_metadata ?? {}) as { persona?: string; onboarded_at?: string };
  return { persona: getPersona(meta.persona)?.id ?? null, onboarded: Boolean(meta.onboarded_at) };
}
