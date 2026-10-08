import { NextResponse } from "next/server";
import { getInsights } from "@/lib/db/insights";
import { getPreferences } from "@/lib/db/preferences";
import { jsonError, requireUser } from "@/lib/utils/api";

function validZone(tz: string) {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** GET /api/insights?date=YYYY-MM-DD&tz=Area/City — progress across every plan. */
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const tz = url.searchParams.get("tz") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError(400, "Invalid date");
  try {
    const [insights, prefs] = await Promise.all([
      getInsights(auth.user.id, date, validZone(tz) ? tz : "UTC"),
      getPreferences(auth.user.id),
    ]);
    return NextResponse.json({ ...insights, dailyMinutes: prefs.dailyMinutes });
  } catch (error) {
    console.error("[insights] failed", { error });
    return jsonError(500, "Couldn’t load insights");
  }
}
