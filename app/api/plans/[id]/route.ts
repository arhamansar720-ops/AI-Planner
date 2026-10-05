import { NextResponse } from "next/server";
import { deletePlan, getPlan, savePlan } from "@/lib/db/plans";
import { applyMutation, MutationError } from "@/lib/planning/mutations";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";
import { MutateRequestSchema } from "@/lib/validation/api";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const plan = await getPlan(auth.supabase, id);
  return plan ? NextResponse.json({ plan }) : jsonError(404, "Not found");
}

/** Apply one or more mutations through the shared reducer, then persist. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, MutateRequestSchema);
  if ("error" in body) return body.error;
  const { id } = await params;

  try {
    let plan = await getPlan(auth.supabase, id);
    if (!plan) return jsonError(404, "Not found");
    for (const mutation of body.data.mutations) plan = applyMutation(plan, mutation);
    await savePlan(auth.supabase, plan);
    return NextResponse.json({ updatedAt: plan.updatedAt });
  } catch (error) {
    if (error instanceof MutationError) return jsonError(422, error.message);
    console.error("[plans] mutation failed", { planId: id, error });
    return jsonError(500, "Could not save changes");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    await deletePlan(auth.supabase, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[plans] delete failed", { planId: id, error });
    return jsonError(500, "Could not delete plan");
  }
}
