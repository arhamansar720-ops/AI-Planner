export const databaseUrl = process.env.DATABASE_URL ?? "";

/**
 * Without DATABASE_URL the app runs on a Postgres built into the server
 * (PGlite, lib/db/embedded.ts). Good for trying the app with the shared test
 * account; data lives on the server's disk and may be reset on redeploys.
 */
export function isEmbeddedDatabase() {
  return !databaseUrl;
}
