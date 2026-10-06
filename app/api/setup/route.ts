import { NextResponse } from "next/server";
import { z } from "zod";
import { PreferencesSchema, updatePreferences } from "@/lib/db/preferences";
import { updateUser } from "@/lib/db/users";
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
    await updatePreferences(auth.user.id, prefs);
    await updateUser(auth.user.id, { persona, onboardedAt: new Date().toISOString() });
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
  try {
    await updateUser(auth.user.id, { persona: body.data.persona });
  } catch (error) {
    console.error("[setup] persona update failed", { error });
    return jsonError(500, "Could not save your mode");
  }
  return NextResponse.json({ ok: true });
}
