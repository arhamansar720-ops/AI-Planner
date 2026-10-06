"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, MessagesSquare, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Markdown } from "@/components/ai/markdown";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "@/components/voice/speak-button";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

type Chat = {
  planId: string;
  planTitle: string;
  messageCount: number;
  lastMessage: { role: "user" | "assistant"; content: string } | null;
  when: string;
};
type Message = { id: string; role: "user" | "assistant"; content: string; changes: string[]; time: string };

export function ChatsView({
  chats,
  selected,
  messages,
}: {
  chats: Chat[];
  selected: { planId: string; planTitle: string } | null;
  messages: Message[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => c.planTitle.toLowerCase().includes(q) || c.lastMessage?.content.toLowerCase().includes(q));
  }, [chats, query]);

  if (chats.length === 0) {
    return (
      <main id="main" className="mx-auto flex max-w-[520px] flex-col items-center px-4 pt-28 text-center">
        <span className="text-[56px]" aria-hidden>
          💬
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">No chats yet</h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          Open a plan and ask the assistant anything, like “What should I do today?” Your conversations will be kept here.
        </p>
        <Button asChild variant="primary" className="mt-7 rounded-full px-5">
          <Link href="/history">Go to your plans</Link>
        </Button>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className={cn("mb-6", selected && "max-md:hidden")}>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Chats</h1>
        <p className="mt-1 text-sm text-fg-muted">Every conversation you’ve had with the assistant, by plan.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
        <section aria-label="Conversations" className={cn("flex flex-col gap-3", selected && "max-md:hidden")}>
          <label className="relative block">
            <span className="sr-only">Search chats</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[14px] outline-none transition-[border-color,box-shadow] placeholder:text-fg-subtle focus:border-accent-line focus:shadow-[0_0_0_4px_var(--accent-soft)]"
            />
          </label>
          <ul className="flex flex-col gap-1.5">
            {filtered.map((c, i) => {
              const active = selected?.planId === c.planId;
              return (
                <motion.li
                  key={c.planId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.03, ease: ease.expo }}
                >
                  <Link
                    href={`/chats?plan=${c.planId}`}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-xl border px-3.5 py-3 transition-colors",
                      active ? "border-accent-line bg-accent-soft" : "border-transparent hover:border-border hover:bg-surface",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[14px] font-medium text-fg">{c.planTitle}</span>
                      <span className="shrink-0 text-[11.5px] text-fg-subtle">{c.when}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-fg-muted">
                      {c.lastMessage?.role === "user" && <span className="text-fg-subtle">You: </span>}
                      {c.lastMessage?.content.replace(/[*_`#]/g, "")}
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-fg-subtle">
                      <MessagesSquare className="size-3" aria-hidden /> {c.messageCount} messages
                    </span>
                  </Link>
                </motion.li>
              );
            })}
            {filtered.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-fg-subtle">No chats match “{query}”.</li>}
          </ul>
        </section>

        <section
          aria-label={selected ? `Chat about ${selected.planTitle}` : "Chat"}
          className={cn("glass flex min-h-[60dvh] flex-col overflow-hidden rounded-3xl", !selected && "max-md:hidden")}
        >
          {selected ? (
            <>
              <header className="flex flex-wrap items-center gap-2 border-b border-glass-edge px-4 py-3 sm:px-5">
                <Link href="/chats" className="-ml-1 rounded-lg p-1 text-fg-muted hover:text-fg md:hidden" aria-label="All chats">
                  <ArrowLeft className="size-4" />
                </Link>
                <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{selected.planTitle}</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/plan/${selected.planId}`}>
                    Open plan <ArrowUpRight />
                  </Link>
                </Button>
                <Button asChild variant="primary" size="sm" className="rounded-full">
                  <Link href={`/plan/${selected.planId}?assistant=open`}>Continue this chat</Link>
                </Button>
              </header>
              <ol className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6">
                {messages.map((m, i) => (
                  <motion.li
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.025, ease: ease.expo }}
                    className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
                  >
                    {m.role === "user" ? (
                      <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border bg-surface px-3.5 py-2 text-[14px] leading-relaxed text-fg shadow-xs">
                        {m.content}
                      </p>
                    ) : (
                      <div className="max-w-[88%] text-[14px] leading-relaxed text-fg-muted">
                        <Markdown text={m.content} />
                        {m.changes.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-1 rounded-xl border border-border bg-surface px-3 py-2">
                            {m.changes.map((c, j) => (
                              <li key={j} className="flex items-center gap-2 text-xs text-fg">
                                <Check className="size-3 text-accent" strokeWidth={2.5} aria-hidden />
                                {c}
                              </li>
                            ))}
                          </ul>
                        )}
                        <SpeakButton id={m.id} text={m.content} className="-ml-1.5 mt-1.5" />
                      </div>
                    )}
                    <span className="mt-1 text-[11px] text-fg-subtle">{m.time}</span>
                  </motion.li>
                ))}
              </ol>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="text-[44px]" aria-hidden>
                💬
              </span>
              <p className="mt-3 text-[15px] font-medium">Pick a conversation</p>
              <p className="mt-1 text-[13px] text-fg-muted">Choose a plan on the left to read the whole chat.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
