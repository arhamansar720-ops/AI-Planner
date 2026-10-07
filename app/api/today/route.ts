import { NextResponse } from "next/server";
import { getPreferences } from "@/lib/db/preferences";
import { getAgenda } from "@/lib/db/today";
import { jsonError, requireUser } from "@/lib/utils/api";

/** GET /api/today?date=YYYY-MM-DD&since=ISO — the person's local day and its start instant. */
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const since = url.searchParams.get("since") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(since))) return jsonError(400, "Invalid date");
  try {
    const [agenda, prefs] = await Promise.all([getAgenda(auth.user.id, date, new Date(since).toISOString()), getPreferences(auth.user.id)]);
    return NextResponse.json({ ...agenda, reminders: prefs.taskReminders, dailyMinutes: prefs.dailyMinutes });
  } catch (error) {
    console.error("[today] failed", { error });
    return jsonError(500, "Couldn’t load today");
  }
}
