import "server-only";
import { query, transaction } from "./pool";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  changes: string[];
  createdAt: string;
};

type MessageRow = { id: string; role: "user" | "assistant"; content: string; changes: unknown; created_at: string };

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const toMessage = (m: MessageRow): ChatMessage => ({
  id: m.id,
  role: m.role,
  content: m.content,
  changes: Array.isArray(m.changes) ? (m.changes as string[]) : [],
  createdAt: m.created_at,
});

export async function getMessages(userId: string, planId: string): Promise<ChatMessage[]> {
  if (!isUuid(planId)) return [];
  const { rows } = await query<MessageRow>(
    `select m.id, m.role, m.content, m.changes, m.created_at
     from messages m join conversations c on c.id = m.conversation_id
     where c.plan_id = $1 and c.user_id = $2
     order by m.created_at limit 200`,
    [planId, userId],
  );
  return rows.map(toMessage);
}

/** Append messages to a plan's conversation (created on first use). The plan must belong to the user. */
export async function appendMessages(
  userId: string,
  planId: string,
  messages: { role: "user" | "assistant"; content: string; changes?: string[] }[],
): Promise<ChatMessage[]> {
  if (!isUuid(planId)) throw new Error("plan not found");
  return transaction(async (db) => {
    const owned = await db.query(`select 1 from plans where id = $1 and user_id = $2`, [planId, userId]);
    if (!owned.rowCount) throw new Error("plan not found");
    const { rows } = await db.query<{ id: string }>(
      `insert into conversations (plan_id, user_id) values ($1, $2)
       on conflict (plan_id) do update set plan_id = excluded.plan_id
       returning id`,
      [planId, userId],
    );
    const conversationId = rows[0].id;
    const base = Date.now();
    const saved: ChatMessage[] = [];
    for (const [i, m] of messages.entries()) {
      const res = await db.query<MessageRow>(
        `insert into messages (conversation_id, user_id, role, content, changes, created_at)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         returning id, role, content, changes, created_at`,
        // Guarantee ordering for messages written in the same request.
        [conversationId, userId, m.role, m.content, JSON.stringify(m.changes ?? []), new Date(base + i).toISOString()],
      );
      saved.push(toMessage(res.rows[0]));
    }
    return saved;
  });
}

export type ChatSummary = {
  planId: string;
  planTitle: string;
  messageCount: number;
  lastMessage: { role: "user" | "assistant"; content: string; createdAt: string } | null;
};

/** Every plan that has an assistant conversation, most recently active first. */
export async function listChats(userId: string): Promise<ChatSummary[]> {
  const { rows } = await query<{
    plan_id: string;
    title: string;
    total: number;
    last_role: "user" | "assistant" | null;
    last_content: string | null;
    last_at: string | null;
  }>(
    `select c.plan_id, p.title,
       (select count(*) from messages m where m.conversation_id = c.id)::int as total,
       l.role as last_role, l.content as last_content, l.created_at as last_at
     from conversations c
     join plans p on p.id = c.plan_id
     left join lateral (
       select role, content, created_at from messages m
       where m.conversation_id = c.id order by m.created_at desc limit 1
     ) l on true
     where c.user_id = $1
     order by l.created_at desc nulls last
     limit 200`,
    [userId],
  );
  return rows
    .filter((r) => r.total > 0)
    .map((r) => ({
      planId: r.plan_id,
      planTitle: r.title,
      messageCount: r.total,
      lastMessage: r.last_role ? { role: r.last_role, content: r.last_content ?? "", createdAt: r.last_at ?? "" } : null,
    }));
}
