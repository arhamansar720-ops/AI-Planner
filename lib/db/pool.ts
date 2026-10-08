import "server-only";
import pg from "pg";
import { embeddedDb } from "./embedded";
import { databaseUrl, isEmbeddedDatabase } from "./env";

// Dates stay "YYYY-MM-DD" strings (the domain uses calendar dates, not instants)
// and timestamps become ISO strings. lib/db/embedded.ts uses the same rules.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());

const ssl =
  process.env.DATABASE_SSL === "false"
    ? false
    : process.env.DATABASE_SSL === "true" || /\.render\.com|sslmode=require|supabase\.(co|com)/.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : false;

type Row = Record<string, unknown>;
export type QueryResult<T extends Row = Row> = { rows: T[]; rowCount: number };
export type Db = { query<T extends Row = Row>(text: string, values?: unknown[]): Promise<QueryResult<T>> };

const globalForPool = globalThis as unknown as { formaPool?: pg.Pool };

/** One pool per server process (kept across hot reloads in development). */
function getPool() {
  globalForPool.formaPool ??= new pg.Pool({
    connectionString: databaseUrl,
    ssl,
    max: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    idleTimeoutMillis: 30_000,
  });
  return globalForPool.formaPool;
}

function fromEmbedded<T extends Row>(res: { rows: T[]; affectedRows?: number }): QueryResult<T> {
  return { rows: res.rows, rowCount: res.rows.length || res.affectedRows || 0 };
}

export async function query<T extends Row = Row>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  if (isEmbeddedDatabase()) return fromEmbedded(await (await embeddedDb()).query<T>(text, values));
  const res = await getPool().query<T>(text, values);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

/** Run `fn` in a transaction. */
export async function transaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  if (isEmbeddedDatabase()) {
    return (await embeddedDb()).transaction((tx) =>
      fn({ query: async <R extends Row>(text: string, values: unknown[] = []) => fromEmbedded(await tx.query<R>(text, values)) }),
    );
  }
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn({
      query: async <R extends Row>(text: string, values: unknown[] = []) => {
        const res = await client.query<R>(text, values);
        return { rows: res.rows, rowCount: res.rowCount ?? 0 };
      },
    });
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
