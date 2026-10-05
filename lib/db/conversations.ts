import "server-only";
import type { ServerSupabase } from "./server";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  changes: string[];
  createdAt: string;
};

async function conversationId(supabase: ServerSupabase, planId: string, userId: string, create: boolean) {
  const { data } = await supabase.from("conversations").select("id").eq("plan_id", planId).maybeSingle();
  if (data?.id || !create) return data?.id ?? null;
  const { data: created, error } = await supabase
    .from("conversations")
    .upsert({ plan_id: planId, user_id: userId }, { onConflict: "plan_id" })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

export async function getMessages(supabase: ServerSupabase, planId: string, userId: string): Promise<ChatMessage[]> {
  const id = await conversationId(supabase, planId, userId, false);
  if (!id) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, changes, created_at")
    .eq("conversation_id", id)
    .order("created_at")
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    changes: Array.isArray(m.changes) ? m.changes : [],
    createdAt: m.created_at,
  }));
}

export async function appendMessages(
  supabase: ServerSupabase,
  planId: string,
  userId: string,
  messages: { role: "user" | "assistant"; content: string; changes?: string[] }[],
): Promise<ChatMessage[]> {
  const id = await conversationId(supabase, planId, userId, true);
  const base = Date.now();
  const { data, error } = await supabase
    .from("messages")
    .insert(
      messages.map((m, i) => ({
        conversation_id: id,
        user_id: userId,
        role: m.role,
        content: m.content,
        changes: m.changes ?? [],
        // Guarantee ordering for messages written in the same request.
        created_at: new Date(base + i).toISOString(),
      })),
    )
    .select("id, role, content, changes, created_at");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    changes: m.changes ?? [],
    createdAt: m.created_at,
  }));
}
