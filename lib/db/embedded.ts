import "server-only";
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { DEMO_EMAIL, demoPassword } from "@/lib/auth/demo";
import { hashPassword } from "@/lib/auth/password";

/**
 * A Postgres that runs inside the server process (PGlite), used when
 * DATABASE_URL isn't set. It runs the same migrations as a real database and
 * creates the shared test account, so the app works with no setup. Data is
 * kept in PGLITE_DIR (default .data/forma-db, or /tmp on serverless hosts,
 * where it lasts only as long as the server instance).
 */

/** Fixed so a signed-in test account stays valid on every server instance. */
export const EMBEDDED_DEMO_USER_ID = "00000000-0000-4000-8000-00000000a0a0";

const globalForDb = globalThis as unknown as { formaEmbedded?: Promise<PGlite> };

function dataDir() {
  if (process.env.PGLITE_DIR) return process.env.PGLITE_DIR;
  const serverless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  return serverless ? "/tmp/forma-db" : path.join(process.cwd(), ".data", "forma-db");
}

async function open(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = dataDir();
  await mkdir(path.dirname(dir), { recursive: true });
  const db = await PGlite.create({
    dataDir: dir,
    // Same conventions as lib/db/pool.ts: dates stay "YYYY-MM-DD", timestamps become ISO strings.
    parsers: {
      1082: (v: string) => v,
      1184: (v: string) => new Date(v).toISOString(),
      1114: (v: string) => new Date(`${v}Z`).toISOString(),
    },
  });
  await migrate(db);
  await syncDemoAdmin(db);
  return db;
}

async function migrate(db: PGlite) {
  await db.exec("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    // gen_random_uuid() is built into Postgres 13+, so pgcrypto isn't needed here.
    const sql = (await readFile(path.join(dir, file), "utf8")).replace(/create extension if not exists pgcrypto;/i, "");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into schema_migrations (name) values ($1)", [file]);
    });
  }
}

async function syncDemoAdmin(db: PGlite) {
  const password = demoPassword();
  const hash = password ? await hashPassword(password) : null;
  await db.query(
    `insert into users (id, email, password_hash, display_name, onboarded_at)
     values ($1, $2, $3, 'Admin', now())
     on conflict (email) do update set password_hash = excluded.password_hash, updated_at = now()`,
    [EMBEDDED_DEMO_USER_ID, DEMO_EMAIL, hash],
  );
}

/** The embedded database, opened (and migrated) on first use. */
export function embeddedDb(): Promise<PGlite> {
  globalForDb.formaEmbedded ??= open().catch((error) => {
    globalForDb.formaEmbedded = undefined;
    throw error;
  });
  return globalForDb.formaEmbedded;
}
