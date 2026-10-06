import { NextResponse } from "next/server";
import { z } from "zod";
import { PreferencesSchema, updatePreferences } from "@/lib/db/preferences";
import { PERSONA_IDS } from "@/lib/personas";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

const SetupSchema = PreferencesSchema.pick({ planningStyle: true, dailyMinutes: true, blockedWeekdays: true }).extend({
  persona: z.enum(PERSONA_IDS).nullable(),
});

/** Finish setup: planning defaults go to preferences, the mode to the account. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, SetupSchema);
  if ("error" in body) return body.error;
  const { persona, ...prefs } = body.data;
  try {
    await updatePreferences(auth.supabase, auth.user.id, prefs);
    const { error } = await auth.supabase.auth.updateUser({
      data: { persona, onboarded_at: new Date().toISOString() },
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[setup] save failed", { error });
    return jsonError(500, "Could not save your setup");
  }
}

const PersonaSchema = z.object({ persona: z.enum(PERSONA_IDS).nullable() });

/** Change just the mode (from Personalize). */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, PersonaSchema);
  if ("error" in body) return body.error;
  const { error } = await auth.supabase.auth.updateUser({ data: { persona: body.data.persona } });
  if (error) {
    console.error("[setup] persona update failed", { error });
    return jsonError(500, "Could not save your mode");
  }
  return NextResponse.json({ ok: true });
}
