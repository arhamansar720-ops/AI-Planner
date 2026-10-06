import "server-only";
import { updateUser, type AppUser } from "@/lib/db/users";
import { getProvider, type StoredConnection } from "./providers";

/** Calendar feeds connected to the account. */
export function readConnections(user: AppUser): StoredConnection[] {
  return user.connections.filter(
    (c): c is StoredConnection =>
      Boolean(c) && typeof c.id === "string" && typeof c.url === "string" && getProvider(c.provider)?.kind === "feed",
  );
}

export async function writeConnections(user: AppUser, connections: StoredConnection[]) {
  await updateUser(user.id, { connections });
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
