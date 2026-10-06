import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchFeed, FeedError, normalizeFeedUrl } from "@/lib/connections/feed";
import { parseIcs, upcoming } from "@/lib/connections/ics";
import { FEED_PROVIDER_IDS } from "@/lib/connections/providers";
import { publicConnection, readConnections, writeConnections } from "@/lib/connections/store";
import { localToday } from "@/lib/planning/dates";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ connections: readConnections(auth.user).map(publicConnection) });
}

const ConnectSchema = z.object({ provider: z.enum(FEED_PROVIDER_IDS), url: z.string().trim().min(8).max(2000) });

/** Connect a calendar feed: read it once to prove it works, then save it. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, ConnectSchema);
  if ("error" in body) return body.error;

  try {
    const url = normalizeFeedUrl(body.data.url).toString();
    const events = upcoming(parseIcs(await fetchFeed(url)), localToday());
    const existing = readConnections(auth.user).filter((c) => c.provider !== body.data.provider);
    const connection = { id: crypto.randomUUID(), provider: body.data.provider, url, addedAt: new Date().toISOString() };
    await writeConnections(auth.user, [...existing, connection].slice(-10));
    return NextResponse.json({ connection: publicConnection(connection), upcoming: events.length, preview: events.slice(0, 5) });
  } catch (error) {
    if (error instanceof FeedError) return jsonError(422, error.message);
    console.error("[connections] connect failed", { error });
    return jsonError(500, "Couldn’t connect that calendar.");
  }
}
