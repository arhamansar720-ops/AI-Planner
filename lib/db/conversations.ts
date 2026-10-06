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

export type ChatSummary = {
  planId: string;
  planTitle: string;
  messageCount: number;
  lastMessage: { role: "user" | "assistant"; content: string; createdAt: string } | null;
};

/** Every plan that has an assistant conversation, most recently active first. */
export async function listChats(supabase: ServerSupabase): Promise<ChatSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("plan_id, created_at, plans(title), last:messages(role, content, created_at), total:messages(count)")
    .order("created_at", { referencedTable: "last", ascending: false })
    .limit(1, { referencedTable: "last" })
    .limit(200);
  if (error) throw error;
  type Row = {
    plan_id: string;
    created_at: string;
    plans: { title: string } | { title: string }[] | null;
    last: { role: "user" | "assistant"; content: string; created_at: string }[];
    total: { count: number }[];
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
      const last = r.last?.[0];
      return {
        planId: r.plan_id,
        planTitle: plan?.title ?? "Untitled plan",
        messageCount: r.total?.[0]?.count ?? 0,
        lastMessage: last ? { role: last.role, content: last.content, createdAt: last.created_at } : null,
      };
    })
    .filter((c) => c.messageCount > 0)
    .sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""));
}
