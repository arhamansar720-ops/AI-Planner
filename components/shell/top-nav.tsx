"use client";

import { History, MessagesSquare, Plus, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";
import { Reminders } from "@/components/today/reminders";
import { CommandPalette, OPEN_COMMANDS_EVENT } from "./command-palette";
import { UserMenu } from "./user-menu";

export type NavUser = { email: string; name: string } | null;

export const NEW_PLAN_EVENT = "forma:new-plan";

const LINKS = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/chats", label: "Chats", icon: MessagesSquare },
  { href: "/history", label: "History", icon: History },
] as const;

export function TopNav({ user, className, children }: { user: NavUser; className?: string; children?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <header className={cn("relative z-40 flex h-14 shrink-0 items-center gap-3 px-4 sm:px-5", className)}>
      <Link
        href="/app"
        onClick={() => window.dispatchEvent(new Event(NEW_PLAN_EVENT))}
        className="-ml-1 rounded-lg px-1 py-1 transition-opacity hover:opacity-80"
        aria-label="Home"
      >
        <Wordmark />
      </Link>
      {children}
      <nav className="ml-auto flex items-center gap-0.5" aria-label="Primary">
        {user ? (
          <>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_COMMANDS_EVENT))}
              className="mr-1 hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface/60 pl-2.5 pr-1.5 text-[13px] text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted md:inline-flex"
              aria-label="Search and commands"
            >
              <Search className="size-3.5" aria-hidden />
              Search
              <kbd className="ml-3 rounded border border-border px-1 font-mono text-[10.5px]">⌘K</kbd>
            </button>
            <Tooltip content="Search (⌘K)">
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search and commands" onClick={() => window.dispatchEvent(new Event(OPEN_COMMANDS_EVENT))}>
                <Search />
              </Button>
            </Tooltip>
            {LINKS.map(({ href, label, icon: Icon }) => (
              <span key={href} className="contents">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn("hidden sm:inline-flex", pathname.startsWith(href) && "bg-surface-2 text-fg")}
                >
                  <Link href={href}>
                    <Icon />
                    {label}
                  </Link>
                </Button>
                <Tooltip content={label}>
                  <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label={label}>
                    <Link href={href}>
                      <Icon />
                    </Link>
                  </Button>
                </Tooltip>
              </span>
            ))}
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/app" onClick={() => window.dispatchEvent(new Event(NEW_PLAN_EVENT))}>
                <Plus />
                New Plan
              </Link>
            </Button>
            <Tooltip content="New plan">
              <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="New plan">
                <Link href="/app" onClick={() => window.dispatchEvent(new Event(NEW_PLAN_EVENT))}>
                  <Plus />
                </Link>
              </Button>
            </Tooltip>
            <UserMenu user={user} />
            <Reminders />
            <CommandPalette />
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="primary" size="sm" className="rounded-full px-4">
              <Link href="/login?mode=signup">Get started</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
