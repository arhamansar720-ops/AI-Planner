import { NextResponse } from "next/server";
import { fetchFeed, FeedError } from "@/lib/connections/feed";
import { describeEvents, parseIcs, upcoming } from "@/lib/connections/ics";
import { getProvider } from "@/lib/connections/providers";
import { readConnections, writeConnections } from "@/lib/connections/store";
import { localToday } from "@/lib/planning/dates";
import { jsonError, requireUser } from "@/lib/utils/api";

type Context = { params: Promise<{ id: string }> };

/** Upcoming items from a connected feed, plus a summary ready to use as plan context. */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const connection = readConnections(auth.user).find((c) => c.id === id);
  if (!connection) return jsonError(404, "Not found");
  try {
    const events = upcoming(parseIcs(await fetchFeed(connection.url)), localToday());
    const name = getProvider(connection.provider)?.name ?? "your calendar";
    return NextResponse.json({ events, summary: describeEvents(name, events) });
  } catch (error) {
    if (error instanceof FeedError) return jsonError(422, error.message);
    console.error("[connections] read failed", { error });
    return jsonError(500, "Couldn’t read that calendar.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    await writeConnections(auth.user, readConnections(auth.user).filter((c) => c.id !== id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[connections] disconnect failed", { error });
    return jsonError(500, "Couldn’t disconnect.");
  }
}
