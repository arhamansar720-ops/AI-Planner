"use client";

import { CalendarCheck, History, LogOut, MessagesSquare, Monitor, Moon, Settings, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/brand";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/overlays";
import { cn } from "@/lib/utils/cn";
import { PALETTES, setAppearance, useAppearance } from "./appearance";
import { useTheme, type Theme } from "./theme";

export type MenuUser = { email: string; name: string };

/** The signed-in account menu: personalization, chats, history, settings, theme. */
export function UserMenu({ user }: { user: MenuUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { palette } = useAppearance();

  return (
    <Menu>
      <MenuTrigger
        className="ml-1 rounded-full outline-none ring-offset-2 ring-offset-bg transition-[opacity,box-shadow] hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Account menu"
      >
        <Avatar name={user.name || user.email} className="size-8" />
      </MenuTrigger>
      <MenuContent align="end" className="w-64">
        <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
          <Avatar name={user.name || user.email} className="size-9 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium">{user.name}</p>
            <p className="truncate text-xs text-fg-subtle">{user.email}</p>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/personalize">
            <Sparkles /> Personalize
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/today">
            <CalendarCheck /> Today
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/chats">
            <MessagesSquare /> Chats
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/history">
            <History /> Plans
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Theme</MenuLabel>
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
        <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-1.5" role="group" aria-label="Color theme">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAppearance({ palette: p.id })}
              aria-label={p.label}
              aria-pressed={palette === p.id}
              title={p.label}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
                palette === p.id ? "ring-2 ring-fg" : "ring-1 ring-border-strong",
              )}
              style={{ background: `linear-gradient(135deg, ${p.swatch[0]} 0 45%, ${p.swatch[1]} 45% 100%)` }}
            />
          ))}
        </div>
        <MenuSeparator />
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
  );
}
