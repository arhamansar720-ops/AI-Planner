"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFocus } from "@/components/focus/focus";
import { useToast } from "@/components/ui/toast";
import { localToday } from "@/lib/planning/dates";
import { dueReminders, formatRange, minuteOfDay } from "@/lib/planning/reminders";
import { fetchToday, type TodayData } from "./today-view";

const REFRESH_MS = 10 * 60_000;
const CHECK_MS = 30_000;
const DIGEST = "digest";

function sentKey(date: string) {
  return `forma:notified:${date}`;
}

function readSent(date: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(sentKey(date)) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSent(date: string, id: string) {
  try {
    const sent = readSent(date);
    sent.add(id);
    localStorage.setItem(sentKey(date), JSON.stringify([...sent]));
    // Forget earlier days.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("forma:notified:") && key !== sentKey(date)) localStorage.removeItem(key);
    }
  } catch {}
}

/**
 * Reminders five minutes before each work session, plus a once-a-day note
 * about deadlines. They come from this page while any Forma tab is open: a
 * system notification when the tab is in the background and permission was
 * granted, otherwise a toast with a button to start focusing.
 */
export function Reminders() {
  const toast = useToast();
  const focus = useFocus();
  const router = useRouter();
  const pathname = usePathname();
  const data = useRef<TodayData | null>(null);
  // Keep the latest callbacks without restarting the timers.
  const ctx = useRef({ toast, focus, router, pathname });
  useEffect(() => {
    ctx.current = { toast, focus, router, pathname };
  });

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      const d = data.current;
      if (!d || !d.reminders) return;
      const today = localToday();
      if (d.date !== today) return; // The day rolled over; wait for the refresh.
      const sent = readSent(today);
      const { toast, focus, router, pathname } = ctx.current;

      for (const s of dueReminders(d.sessions, today, minuteOfDay(new Date()), sent)) {
        markSent(today, s.id);
        const when = formatRange(s.startMinute, s.durationMinutes);
        const task = { planId: s.planId, taskId: s.taskId, title: s.taskTitle, planTitle: s.planTitle };
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(`Up next: ${s.taskTitle}`, { body: `${when} · ${s.planTitle}`, tag: `forma-${s.id}`, icon: "/icon.svg" });
            n.onclick = () => {
              window.focus();
              router.push("/today");
              n.close();
            };
            continue;
          } catch {}
        }
        toast({
          message: `Up next, ${when.split(" – ")[0]}: ${s.taskTitle}`,
          action: { label: "Start focus", onClick: () => focus.start(task, Math.min(50, Math.max(15, s.durationMinutes))) },
        });
      }

      const due = d.overdue.length + d.dueToday.length;
      if (due > 0 && !sent.has(DIGEST) && pathname !== "/today") {
        markSent(today, DIGEST);
        const parts = [d.dueToday.length && `${d.dueToday.length} due today`, d.overdue.length && `${d.overdue.length} overdue`].filter(Boolean);
        toast({
          message: `Deadlines: ${parts.join(", ")}`,
          action: { label: "Open Today", onClick: () => router.push("/today") },
        });
      }
    };

    const refresh = async () => {
      const next = await fetchToday();
      if (cancelled || !next) return;
      data.current = next;
      check();
    };

    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), REFRESH_MS);
    const checkTimer = window.setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.clearInterval(checkTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
