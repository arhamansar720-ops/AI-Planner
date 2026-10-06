import { query } from "@/lib/db/pool";

/** For Render's health check: the server is up and the database answers. */
export async function GET() {
  try {
    await query("select 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
