import "server-only";
import type { User } from "@supabase/supabase-js";
import type { ServerSupabase } from "@/lib/db/server";
import { getProvider, type StoredConnection } from "./providers";

/** Calendar feeds live in the account's user metadata: small, private to the account. */
export function readConnections(user: User): StoredConnection[] {
  const raw = (user.user_metadata as { connections?: unknown }).connections;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is StoredConnection =>
      Boolean(c) && typeof c.id === "string" && typeof c.url === "string" && getProvider(c.provider)?.kind === "feed",
  );
}

export async function writeConnections(supabase: ServerSupabase, connections: StoredConnection[]) {
  const { error } = await supabase.auth.updateUser({ data: { connections } });
  if (error) throw error;
}

/** What the browser sees: never the secret feed address itself. */
export function publicConnection(c: StoredConnection) {
  let host = "";
  try {
    host = new URL(c.url).hostname;
  } catch {}
  return { id: c.id, provider: c.provider, host, addedAt: c.addedAt };
}
export type PublicConnection = ReturnType<typeof publicConnection>;
