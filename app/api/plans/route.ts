import { NextResponse } from "next/server";
import { listPlans, savePlan, deleteAllPlans } from "@/lib/db/plans";
import { query } from "@/lib/db/pool";
import { normalizePlan } from "@/lib/planning/schedule";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";
import { CreatePlanRequestSchema } from "@/lib/validation/api";
import { PlanSchema } from "@/lib/validation/plan";

/** Plans a single account may create per rolling hour. */
const HOURLY_LIMIT = 30;

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ plans: await listPlans(auth.user.id) });
}

/**
 * Save a plan generated in the browser. The server never trusts the client's
 * shape: it re-normalizes (dates, schedule, ordering), validates and assigns
 * a fresh id before writing.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, CreatePlanRequestSchema);
  if ("error" in body) return body.error;
  const { rows } = await query<{ count: number }>(
    `select count(*)::int as count from plans where user_id = $1 and created_at > now() - interval '1 hour'`,
    [auth.user.id],
  );
  if ((rows[0]?.count ?? 0) >= HOURLY_LIMIT) {
    return jsonError(429, "You’ve made a lot of plans in the last hour. Try again a little later.");
  }

  const now = new Date().toISOString();
  const parsed = PlanSchema.safeParse(
    normalizePlan({ ...body.data.plan, id: crypto.randomUUID(), status: "active", createdAt: now, updatedAt: now }),
  );
  if (!parsed.success) return jsonError(400, "Invalid plan");
  try {
    await savePlan(auth.user.id, parsed.data);
    return NextResponse.json({ plan: parsed.data }, { status: 201 });
  } catch (error) {
    console.error("[plans] create failed", { error });
    return jsonError(500, "Could not save the plan");
  }
}

/** Delete every plan the user owns (Settings → Data). */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    await deleteAllPlans(auth.user.id);
  } catch (error) {
    console.error("[plans] bulk delete failed", { error });
    return jsonError(500, "Could not delete plans");
  }
  return new NextResponse(null, { status: 204 });
}
