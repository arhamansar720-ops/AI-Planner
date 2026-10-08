import { NextResponse } from "next/server";
import { FeedError } from "@/lib/connections/feed";
import { describeEvents } from "@/lib/connections/ics";
import { getProvider } from "@/lib/connections/providers";
import { readConnectionEvents, readConnections, writeConnections } from "@/lib/connections/store";
import { TweekError } from "@/lib/connections/tweek";
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
    const events = await readConnectionEvents(connection, localToday());
    const name = getProvider(connection.provider)?.name ?? "your calendar";
    return NextResponse.json({ events, summary: describeEvents(name, events) });
  } catch (error) {
    if (error instanceof FeedError || error instanceof TweekError) return jsonError(422, error.message);
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
