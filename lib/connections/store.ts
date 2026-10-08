import "server-only";
import { updateUser, type AppUser } from "@/lib/db/users";
import { fetchFeed } from "./feed";
import { parseIcs, upcoming, type FeedEvent } from "./ics";
import { getProvider, type StoredConnection } from "./providers";
import { fetchTweekEvents, TweekError } from "./tweek";

/** Calendar feeds and API-key connections on the account. */
export function readConnections(user: AppUser): StoredConnection[] {
  return user.connections.filter(
    (c): c is StoredConnection =>
      Boolean(c) && typeof c.id === "string" && typeof c.url === "string" && getProvider(c.provider)?.kind !== "paste",
  );
}

export async function writeConnections(user: AppUser, connections: StoredConnection[]) {
  await updateUser(user.id, { connections });
}

/** What the browser sees: never the secret feed address or API key. */
export function publicConnection(c: StoredConnection) {
  let host = "";
  try {
    host = new URL(c.url).hostname;
  } catch {}
  return { id: c.id, provider: c.provider, host, addedAt: c.addedAt };
}
export type PublicConnection = ReturnType<typeof publicConnection>;

/** Upcoming items from a stored connection, whatever kind it is. */
export async function readConnectionEvents(c: StoredConnection, from: string): Promise<FeedEvent[]> {
  if (getProvider(c.provider)?.kind === "token") {
    if (!c.token) throw new TweekError("Reconnect Tweek with your API key.");
    return upcoming(await fetchTweekEvents(c.token, from), from);
  }
  return upcoming(parseIcs(await fetchFeed(c.url)), from);
}
