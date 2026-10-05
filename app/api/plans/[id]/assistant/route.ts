import { NextResponse } from "next/server";
import { appendMessages, getMessages } from "@/lib/db/conversations";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";
import { RecordExchangeSchema } from "@/lib/validation/api";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const messages = await getMessages(auth.supabase, id, auth.user.id);
  return NextResponse.json({ messages });
}

/**
 * Record one exchange with the on-device assistant. Plan edits it made are
 * saved separately through PATCH /api/plans/[id] as ordinary mutations.
 */
export async function POST(request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, RecordExchangeSchema);
  if ("error" in body) return body.error;
  const { id } = await params;
  const { supabase, user } = auth;

  const { data: plan } = await supabase.from("plans").select("id").eq("id", id).maybeSingle();
  if (!plan) return jsonError(404, "Not found");
  try {
    const saved = await appendMessages(supabase, id, user.id, [
      { role: "user", content: body.data.message },
      { role: "assistant", content: body.data.reply, changes: body.data.changes },
    ]);
    return NextResponse.json({ userMessage: saved[0], reply: saved[1] });
  } catch (error) {
    console.error("[assistant] record failed", { planId: id, error });
    return jsonError(500, "Could not save the conversation");
  }
}
