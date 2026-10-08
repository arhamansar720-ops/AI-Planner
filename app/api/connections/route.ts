import { NextResponse } from "next/server";
import { z } from "zod";
import { FeedError, normalizeFeedUrl } from "@/lib/connections/feed";
import { getProvider, SERVER_PROVIDER_IDS, type StoredConnection } from "@/lib/connections/providers";
import { publicConnection, readConnectionEvents, readConnections, writeConnections } from "@/lib/connections/store";
import { TWEEK_API, TweekError } from "@/lib/connections/tweek";
import { localToday } from "@/lib/planning/dates";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ connections: readConnections(auth.user).map(publicConnection) });
}

// `url` is the calendar link, or the API key for providers that use one (Tweek).
const ConnectSchema = z.object({ provider: z.enum(SERVER_PROVIDER_IDS), url: z.string().trim().min(8).max(2000) });

/** Connect a calendar feed or API key: read it once to prove it works, then save it. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, ConnectSchema);
  if ("error" in body) return body.error;

  try {
    const base = { id: crypto.randomUUID(), provider: body.data.provider, addedAt: new Date().toISOString() };
    const connection: StoredConnection =
      getProvider(body.data.provider)?.kind === "token"
        ? { ...base, url: TWEEK_API, token: body.data.url.replace(/\s+/g, "") }
        : { ...base, url: normalizeFeedUrl(body.data.url).toString() };
    const events = await readConnectionEvents(connection, localToday());
    const existing = readConnections(auth.user).filter((c) => c.provider !== body.data.provider);
    await writeConnections(auth.user, [...existing, connection].slice(-10));
    return NextResponse.json({ connection: publicConnection(connection), upcoming: events.length, preview: events.slice(0, 5) });
  } catch (error) {
    if (error instanceof FeedError || error instanceof TweekError) return jsonError(422, error.message);
    console.error("[connections] connect failed", { error });
    return jsonError(500, "Couldn’t connect that calendar.");
  }
}
