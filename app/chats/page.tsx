import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatsView } from "@/components/chats/chats-view";
import { TopNav } from "@/components/shell/top-nav";
import { getMessages, listChats } from "@/lib/db/conversations";
import { getSession } from "@/lib/auth/session";
import { getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Chats" };

type Props = { searchParams: Promise<{ plan?: string }> };

/** "3 hours ago" labels, computed once per request on the server. */
function withTimes<T extends { lastMessage: { createdAt: string } | null }>(chats: T[]) {
  const now = Date.now();
  return chats.map((c) => ({ ...c, when: c.lastMessage ? relative(c.lastMessage.createdAt, now) : "" }));
}

function relative(iso: string, now: number) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
    ["year", Infinity],
  ];
  let value = diff;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}

export default async function ChatsPage({ searchParams }: Props) {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/chats");
  const { plan } = await searchParams;
  const [navUser, chats] = await Promise.all([getNavUser(user), listChats(user.id).catch(() => [])]);
  const selected = plan ? chats.find((c) => c.planId === plan) ?? null : null;
  const messages = selected ? await getMessages(user.id, selected.planId).catch(() => []) : [];

  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <ChatsView
        chats={withTimes(chats)}
        selected={selected ? { planId: selected.planId, planTitle: selected.planTitle } : null}
        messages={messages.map((m) => ({
          ...m,
          time: new Date(m.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
        }))}
      />
    </div>
  );
}
