import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUser } from "@/lib/db/users";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

const Schema = z.object({ name: z.string().trim().min(1).max(80) });

/** Update the account's display name. */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  try {
    await updateUser(auth.user.id, { name: body.data.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account] update failed", { error });
    return jsonError(500, "Couldn’t update your name.");
  }
}
