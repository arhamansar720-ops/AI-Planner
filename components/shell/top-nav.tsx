"use client";

import { History, LogOut, Monitor, Moon, Plus, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
} from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";
import { useTheme, type Theme } from "./theme";

export type NavUser = { email: string; name: string } | null;

export const NEW_PLAN_EVENT = "forma:new-plan";

export function TopNav({ user, className, children }: { user: NavUser; className?: string; children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <header className={cn("relative z-40 flex h-14 shrink-0 items-center gap-3 px-4 sm:px-5", className)}>
      <Link
        href="/"
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
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn("hidden sm:inline-flex", pathname === "/history" && "bg-surface-2 text-fg")}
            >
              <Link href="/history">
                <History />
                History
              </Link>
            </Button>
            <Tooltip content="History">
              <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="History">
                <Link href="/history">
                  <History />
                </Link>
              </Button>
            </Tooltip>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/" onClick={() => window.dispatchEvent(new Event(NEW_PLAN_EVENT))}>
                <Plus />
                New Plan
              </Link>
            </Button>
            <Tooltip content="New plan">
              <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="New plan">
                <Link href="/" onClick={() => window.dispatchEvent(new Event(NEW_PLAN_EVENT))}>
                  <Plus />
                </Link>
              </Button>
            </Tooltip>
            <Tooltip content="Settings">
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Settings"
                className={cn(pathname === "/settings" && "bg-surface-2 text-fg")}
              >
                <Link href="/settings">
                  <Settings />
                </Link>
              </Button>
            </Tooltip>
            <Menu>
              <MenuTrigger
                className="ml-1.5 rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar name={user.name || user.email} />
              </MenuTrigger>
              <MenuContent align="end" className="w-56">
                <div className="px-2.5 pb-2 pt-1.5">
                  <p className="truncate text-[13px] font-medium">{user.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                </div>
                <MenuSeparator />
                <MenuLabel>Appearance</MenuLabel>
                <MenuRadioGroup
                  value={theme}
                  onValueChange={(v) => {
                    setTheme(v as Theme);
                    void fetch("/api/preferences", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ theme: v }),
                    });
                  }}
                >
                  <MenuRadioItem value="light">
                    <Sun /> Light
                  </MenuRadioItem>
                  <MenuRadioItem value="dark">
                    <Moon /> Dark
                  </MenuRadioItem>
                  <MenuRadioItem value="system">
                    <Monitor /> System
                  </MenuRadioItem>
                </MenuRadioGroup>
                <MenuSeparator />
                <MenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </MenuItem>
                <MenuItem
                  onSelect={async () => {
                    await fetch("/auth/signout", { method: "POST" });
                    router.replace("/");
                router.refresh();
                  }}
                >
                  <LogOut /> Sign out
                </MenuItem>
              </MenuContent>
            </Menu>
          </>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
