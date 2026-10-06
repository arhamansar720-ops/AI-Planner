import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { clientIp, rateLimited } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/db/users";
import { jsonError, readJson } from "@/lib/utils/api";

const Schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const body = await readJson(request, Schema);
  if ("error" in body) return body.error;
  if (rateLimited(`signup:${clientIp(request)}`, 8, 60 * 60_000)) {
    return jsonError(429, "Too many new accounts from here. Try again later.");
  }
  const { email, password, name } = body.data;
  // Reserved for the shared test account.
  if (email.toLowerCase().endsWith("@forma.local")) return jsonError(400, "Use a real email address.");
  if (await findUserByEmail(email)) return jsonError(409, "An account with that email already exists. Try signing in.");
  try {
    const user = await createUser({ email, passwordHash: await hashPassword(password), name });
    await createSession(user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return jsonError(409, "An account with that email already exists. Try signing in.");
    console.error("[auth] signup failed", { error });
    return jsonError(500, "Couldn’t create your account.");
  }
}
