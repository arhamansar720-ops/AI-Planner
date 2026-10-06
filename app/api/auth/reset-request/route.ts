import { NextResponse } from "next/server";
import { z } from "zod";
import { emailConfigured, sendEmail } from "@/lib/auth/email";
import { appOrigin } from "@/lib/auth/oauth";
import { clientIp, rateLimited } from "@/lib/auth/rate-limit";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { query } from "@/lib/db/pool";
import { findUserByEmail } from "@/lib/db/users";
import { jsonError, readJson } from "@/lib/utils/api";

const Schema = z.object({ email: z.string().trim().email().max(320) });

/** Email a one-hour reset link. Always answers the same way, so accounts can't be discovered. */
export async function POST(request: Request) {
  if (!emailConfigured()) return jsonError(503, "Password reset isn’t available on this site yet.");
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  if (rateLimited(`reset:${clientIp(request)}`, 5, 60 * 60_000)) return jsonError(429, "Too many requests. Try again later.");

  const user = await findUserByEmail(body.data.email);
  if (user) {
    const token = newToken();
    await query(`insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')`, [
      hashToken(token),
      user.id,
    ]);
    const link = `${appOrigin(request)}/reset-password?token=${token}`;
    await sendEmail(
      user.email,
      "Reset your Forma password",
      `Open this link to choose a new password (it expires in an hour):\n\n${link}\n\nIf you didn’t ask for this, you can ignore this email.`,
      `<p>Open this link to choose a new password. It expires in an hour.</p><p><a href="${link}">Choose a new password</a></p><p>If you didn’t ask for this, you can ignore this email.</p>`,
    ).catch((error) => console.error("[auth] reset email failed", { error }));
  }
  return NextResponse.json({ ok: true });
}
