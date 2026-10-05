import { exportPlans } from "@/lib/db/plans";
import { jsonError, requireUser } from "@/lib/utils/api";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    const plans = await exportPlans(auth.supabase);
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), plans }, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="forma-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("[export] failed", { error });
    return jsonError(500, "Export failed");
  }
}
