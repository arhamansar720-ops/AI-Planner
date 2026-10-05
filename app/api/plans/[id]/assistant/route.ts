import { NextResponse } from "next/server";
import { runAssistant } from "@/lib/ai/assistant";
import { pickModel } from "@/lib/ai/client";
import { appendMessages, getMessages } from "@/lib/db/conversations";
import { getPlan, savePlan } from "@/lib/db/plans";
import { getPreferences } from "@/lib/db/preferences";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";
import { AssistantRequestSchema } from "@/lib/validation/api";

export const runtime = "nodejs";
export const maxDuration = 120;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const messages = await getMessages(auth.supabase, id, auth.user.id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, AssistantRequestSchema);
  if ("error" in body) return body.error;
  const { id } = await params;
  const { supabase, user } = auth;

  try {
    const plan = await getPlan(supabase, id);
    if (!plan) return jsonError(404, "Not found");
    const [history, preferences] = await Promise.all([
      getMessages(supabase, id, user.id),
      getPreferences(supabase, user.id),
    ]);

    const result = await runAssistant({
      plan,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      message: body.data.message,
      today: body.data.today,
      model: pickModel(preferences.model),
      responseStyle: preferences.responseStyle,
    });

    if (result.changes.length) await savePlan(supabase, result.plan);
    const saved = await appendMessages(supabase, id, user.id, [
      { role: "user", content: body.data.message },
      { role: "assistant", content: result.reply, changes: result.changes },
    ]);

    return NextResponse.json({
      reply: saved[1],
      userMessage: saved[0],
      plan: result.changes.length ? result.plan : null,
      changes: result.changes,
    });
  } catch (error) {
    console.error("[assistant] request failed", { planId: id, error });
    return jsonError(500, "The assistant couldn't respond. Please try again.");
  }
}
