import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { query } from "@/lib/db/pool";
import { updateUser } from "@/lib/db/users";
import { jsonError, readJson } from "@/lib/utils/api";

const Schema = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(200) });

/** Set a new password from a reset link, sign out everywhere, then sign in here. */
export async function POST(request: Request) {
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  const { rows } = await query<{ user_id: string }>(
    `update password_resets set used_at = now()
     where token_hash = $1 and used_at is null and expires_at > now()
     returning user_id`,
    [hashToken(body.data.token)],
  );
  const userId = rows[0]?.user_id;
  if (!userId) return jsonError(400, "That reset link has expired. Request a new one.");
  await updateUser(userId, { passwordHash: await hashPassword(body.data.password) });
  await destroyAllSessions(userId);
  await createSession(userId);
  return NextResponse.json({ ok: true });
}
