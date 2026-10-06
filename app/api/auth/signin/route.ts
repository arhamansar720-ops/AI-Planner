import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { clientIp, rateLimited } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/db/users";
import { jsonError, readJson } from "@/lib/utils/api";

const Schema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  const { email, password } = body.data;
  if (rateLimited(`signin:${clientIp(request)}:${email.toLowerCase()}`)) {
    return jsonError(429, "Too many attempts. Wait a few minutes and try again.");
  }
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) {
    // Same answer either way, so accounts can't be discovered by email.
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86));
    return jsonError(401, user ? "This account uses Google or Microsoft sign-in." : "That email and password don’t match.");
  }
  if (!(await verifyPassword(password, user.passwordHash))) return jsonError(401, "That email and password don’t match.");
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
