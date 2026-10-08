import type { FeedEvent } from "./ics";

/**
 * Tweek (tweek.so) through its REST API with a personal API key (sent as
 * X-API-Key). Read-only: lists the person's calendars, then the dated,
 * unfinished tasks in each for the next few weeks.
 */

// TWEEK_API_BASE exists for tests against a local stand-in.
export const TWEEK_API = process.env.TWEEK_API_BASE || "https://tweek.so/api/v1";
const MAX_CALENDARS = 6;
const MAX_PAGES = 4;

export class TweekError extends Error {}

type TweekCalendar = { id: string; name?: string };
type TweekTask = { id?: string; text?: string; note?: string; done?: boolean; date?: string; isoDate?: string; dtStart?: string; deleted?: boolean };

/** Accepts a bare array or `{ data: [...] }`. */
function list<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) return (body as { data: T[] }).data;
  return [];
}

/** "2026-10-08", "2026-10-08T14:30:00Z" or similar → date and, when present, a clock time. */
function when(task: TweekTask): { date: string; time: string | null } | null {
  const raw = task.isoDate || task.date || task.dtStart || "";
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) return null;
  return { date: m[1], time: task.dtStart && m[2] ? m[2] : null };
}

/** Dated, unfinished Tweek tasks as calendar events. */
export function tweekTasksToEvents(tasks: TweekTask[], calendarName?: string): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (const task of tasks) {
    if (task.done || task.deleted) continue;
    const title = (task.text ?? "").trim();
    const at = when(task);
    if (!title || !at) continue;
    out.push({
      title: calendarName ? `${title} (${calendarName})` : title,
      date: at.date,
      allDay: !at.time,
      time: at.time,
      description: (task.note ?? "").slice(0, 500),
    });
  }
  return out;
}

async function call(path: string, apiKey: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${TWEEK_API}${path}`, {
      headers: { "X-API-Key": apiKey, accept: "application/json", "user-agent": "Forma calendar reader" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new TweekError("Couldn’t reach Tweek. Try again in a moment.");
  }
  if (res.status === 401 || res.status === 403) throw new TweekError("Tweek didn’t accept that API key. Check it and try again.");
  if (res.status === 429) throw new TweekError("Tweek is rate-limiting requests. Try again in a minute.");
  if (!res.ok) throw new TweekError("Tweek couldn’t be read right now.");
  return res.json().catch(() => {
    throw new TweekError("Tweek sent an unexpected response.");
  });
}

/** Upcoming tasks across the person's Tweek calendars. */
export async function fetchTweekEvents(apiKey: string, from: string, days = 70): Promise<FeedEvent[]> {
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  const to = end.toISOString().slice(0, 10);
  const calendars = list<TweekCalendar>(await call("/calendars", apiKey)).filter((c) => c && typeof c.id === "string").slice(0, MAX_CALENDARS);
  const named = calendars.length > 1;
  const events: FeedEvent[] = [];
  for (const cal of calendars) {
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ calendarId: cal.id, dateFrom: from, dateTo: to });
      if (cursor) params.set("startAt", cursor);
      const body = await call(`/tasks?${params}`, apiKey);
      events.push(...tweekTasksToEvents(list<TweekTask>(body), named ? cal.name : undefined));
      cursor = (body as { nextDocId?: string })?.nextDocId;
      if (!cursor) break;
    }
  }
  return events;
}
