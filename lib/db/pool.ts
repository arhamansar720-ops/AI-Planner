import "server-only";
import pg from "pg";
import { databaseUrl } from "./env";

// Dates stay "YYYY-MM-DD" strings (the domain uses calendar dates, not instants)
// and timestamps become ISO strings.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());

const ssl =
  process.env.DATABASE_SSL === "false"
    ? false
    : process.env.DATABASE_SSL === "true" || /\.render\.com|sslmode=require/.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : false;

const globalForPool = globalThis as unknown as { formaPool?: pg.Pool };

/** One pool per server process (kept across hot reloads in development). */
export const pool =
  globalForPool.formaPool ??
  new pg.Pool({ connectionString: databaseUrl, ssl, max: Number(process.env.DATABASE_POOL_SIZE ?? 5), idleTimeoutMillis: 30_000 });
if (process.env.NODE_ENV !== "production") globalForPool.formaPool = pool;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}

/** Run `fn` in a transaction. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
