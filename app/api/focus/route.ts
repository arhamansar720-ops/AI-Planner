import { NextResponse } from "next/server";
import { z } from "zod";
import { recordFocus } from "@/lib/db/today";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";

const uuid = z.string().uuid();
const Schema = z.object({
  planId: uuid.nullable().default(null),
  taskId: uuid.nullable().default(null),
  taskTitle: z.string().trim().max(200).default(""),
  minutes: z.number().int().min(1).max(600),
  startedAt: z.string().datetime({ offset: true }),
});

/** Record minutes spent in a focus session. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  try {
    await recordFocus(auth.user.id, body.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[focus] record failed", { error });
    return jsonError(500, "Couldn’t save the session");
  }
}
