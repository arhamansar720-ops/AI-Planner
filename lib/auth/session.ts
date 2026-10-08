import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { isEmbeddedDatabase } from "@/lib/db/env";
import { query } from "@/lib/db/pool";
import { rowToUser, USER_COLUMNS, type AppUser } from "@/lib/db/users";
import { demoPassword } from "./demo";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "forma_session";
const SESSION_DAYS = 30;

/** HTTPS-only cookies whenever the site is served over HTTPS (always, on Render). */
function secureCookies() {
  const origin = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (origin) return origin.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

/*
 * On the built-in database (no DATABASE_URL) a serverless host may answer
 * each request from a different instance, each with its own copy of the
 * data, so sessions there are signed cookies instead of database rows.
 */
const SIGNED_PREFIX = "s.";

function signingKey() {
  return process.env.AUTH_SECRET || `forma-embedded:${demoPassword()}`;
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** The user id in a valid signed session token, or null. */
export function readSignedToken(token: string, now = Date.now()): string | null {
  if (!token.startsWith(SIGNED_PREFIX)) return null;
  const [userId, exp, sig] = token.slice(SIGNED_PREFIX.length).split(".");
  if (!userId || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${userId}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(exp) > now ? userId : null;
}

export function signedToken(userId: string, expires: Date) {
  const payload = `${userId}.${expires.getTime()}`;
  return `${SIGNED_PREFIX}${payload}.${sign(payload)}`;
}

/** Start a session for `userId` and set its cookie. Call from a route handler. */
export async function createSession(userId: string) {
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  let token: string;
  if (isEmbeddedDatabase()) {
    token = signedToken(userId, expires);
  } else {
    token = newToken();
    await query(`insert into sessions (id, user_id, expires_at) values ($1, $2, $3)`, [hashToken(token), userId, expires.toISOString()]);
    // Housekeeping: drop this user's expired sessions.
    await query(`delete from sessions where user_id = $1 and expires_at < now()`, [userId]);
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires,
  });
}

/** The signed-in user for this request (verified against the database), or null. */
export const getSession = cache(async (): Promise<{ user: AppUser | null }> => {
  await connection(); // always per-request, never prerendered
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { user: null };
  if (isEmbeddedDatabase()) {
    const userId = readSignedToken(token);
    if (!userId) return { user: null };
    const { rows } = await query(`select ${USER_COLUMNS} from users u where u.id = $1`, [userId]);
    return { user: rows[0] ? rowToUser(rows[0] as Parameters<typeof rowToUser>[0]) : null };
  }
  const { rows } = await query(
    `select ${USER_COLUMNS} from sessions s join users u on u.id = s.user_id where s.id = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return { user: rows[0] ? rowToUser(rows[0] as Parameters<typeof rowToUser>[0]) : null };
});

/** End this browser's session. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && !isEmbeddedDatabase()) await query(`delete from sessions where id = $1`, [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

/** Sign out everywhere (after a password change). */
export async function destroyAllSessions(userId: string) {
  await query(`delete from sessions where user_id = $1`, [userId]);
}
