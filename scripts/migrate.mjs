// Applies db/migrations/*.sql in order, once each, inside transactions.
// Runs on every start (Render's free plan has no pre-deploy step); an
// advisory lock keeps two instances from migrating at the same time.
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
} finally {
  await client.query("select pg_advisory_unlock(727272)").catch(() => {});
  await client.end();
}
