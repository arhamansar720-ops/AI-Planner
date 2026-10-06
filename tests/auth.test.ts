import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, newToken } from "@/lib/auth/tokens";

test("passwords hash with a random salt and verify", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.match(a, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("correct horse battery", a), true);
  assert.equal(await verifyPassword("correct horse batterY", a), false);
  assert.equal(await verifyPassword("anything", null), false);
  assert.equal(await verifyPassword("anything", "md5$abc"), false);
});

test("tokens are random and only their hashes are stored", () => {
  const t = newToken();
  assert.ok(t.length >= 40 && t !== newToken());
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
});
