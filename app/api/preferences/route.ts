import { NextResponse } from "next/server";
import { PreferencesSchema, updatePreferences } from "@/lib/db/preferences";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, PreferencesSchema.partial());
  if ("error" in body) return body.error;
  try {
    await updatePreferences(auth.user.id, body.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[preferences] update failed", { error });
    return jsonError(500, "Could not save preferences");
  }
}
