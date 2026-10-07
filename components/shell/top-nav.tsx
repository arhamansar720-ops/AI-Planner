"use client";

import { History, MessagesSquare, Plus, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";
import { Reminders } from "@/components/today/reminders";
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
