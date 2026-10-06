// Applies db/migrations/*.sql in order, once each, inside transactions.
// Runs on every start (Render's free plan has no pre-deploy step); an
// advisory lock keeps two instances from migrating at the same time.
import { randomBytes, scryptSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL is not set; skipping.");
  process.exit(0);
}

// Render's external hostnames (and most hosted Postgres) need TLS; the internal one doesn't.
const ssl =
  process.env.DATABASE_SSL === "false"
    ? false
    : process.env.DATABASE_SSL === "true" || /\.render\.com|sslmode=require/.test(url)
      ? { rejectUnauthorized: false }
      : false;

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  await client.query("select pg_advisory_lock(727272)");
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`[migrate] applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`[migrate] ${file} failed: ${error.message}`);
    }
  }
  console.log("[migrate] database is up to date");
  await syncDemoAdmin(client);
} finally {
  await client.query("select pg_advisory_unlock(727272)").catch(() => {});
  await client.end();
}

/**
 * A shared test account, username "admin", whose password comes from
 * DEMO_ADMIN_PASSWORD. Set the variable to create it (or change its
 * password); remove it to switch the account's password sign-in off.
 */
async function syncDemoAdmin(db) {
  const email = "admin@forma.local";
  const password = process.env.DEMO_ADMIN_PASSWORD ?? "";
  if (password.length >= 8) {
    const salt = randomBytes(16);
    const hash = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const stored = ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
    await db.query(
      `insert into users (email, password_hash, display_name, onboarded_at)
       values ($1, $2, 'Admin', now())
       on conflict (email) do update set password_hash = excluded.password_hash, updated_at = now()`,
      [email, stored],
    );
    console.log('[migrate] test account "admin" is enabled');
  } else {
    const res = await db.query(`update users set password_hash = null where email = $1 and password_hash is not null`, [email]);
    if (password) console.log("[migrate] DEMO_ADMIN_PASSWORD must be at least 8 characters; test account left disabled");
    else if (res.rowCount) console.log('[migrate] test account "admin" disabled (DEMO_ADMIN_PASSWORD not set)');
  }
}
