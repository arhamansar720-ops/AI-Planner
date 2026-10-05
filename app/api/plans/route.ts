import { NextResponse } from "next/server";
import { listPlans } from "@/lib/db/plans";
import { jsonError, requireUser } from "@/lib/utils/api";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ plans: await listPlans(auth.supabase) });
}

/** Delete every plan the user owns (Settings → Data). */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { error } = await auth.supabase.from("plans").delete().eq("user_id", auth.user.id);
  if (error) {
    console.error("[plans] bulk delete failed", { error });
    return jsonError(500, "Could not delete plans");
  }
  return new NextResponse(null, { status: 204 });
}
