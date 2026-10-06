import { createHash, randomBytes } from "node:crypto";

/** A random, URL-safe secret for cookies and email links. */
export function newToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Only hashes of tokens are stored, so a database leak can't be replayed. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
