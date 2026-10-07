/**
 * Pure helpers for session reminders, kept apart from the browser APIs so
 * they can be unit tested.
 */

export type ReminderSession = {
  id: string;
  date: string;
  startMinute: number;
  durationMinutes: number;
  taskStatus: "todo" | "in_progress" | "done";
};

/** Minutes before a session starts that its reminder goes out. */
export const REMINDER_LEAD = 5;
/** A reminder that is this late (after the start) is no longer worth sending. */
const REMINDER_GRACE = 10;

/** Minutes since local midnight. */
export function minuteOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Sessions whose reminder is due right now and hasn't been sent. */
export function dueReminders<T extends ReminderSession>(sessions: T[], today: string, nowMinute: number, sent: ReadonlySet<string>): T[] {
  return sessions.filter(
    (s) =>
      s.date === today &&
      s.taskStatus !== "done" &&
      !sent.has(s.id) &&
      nowMinute >= s.startMinute - REMINDER_LEAD &&
      nowMinute < s.startMinute + REMINDER_GRACE,
  );
}

/** Milliseconds until the next reminder should go out today, or null if none remain. */
export function nextReminderDelay(sessions: ReminderSession[], today: string, now: Date, sent: ReadonlySet<string>): number | null {
  const nowMinute = minuteOfDay(now);
  const upcoming = sessions
    .filter((s) => s.date === today && s.taskStatus !== "done" && !sent.has(s.id) && s.startMinute - REMINDER_LEAD > nowMinute)
    .map((s) => s.startMinute - REMINDER_LEAD);
  if (upcoming.length === 0) return null;
  const target = Math.min(...upcoming);
  const ms = (target - nowMinute) * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
  return Math.max(0, ms);
}

/** "9:00 – 9:45 AM" style range from local minutes. */
export function formatRange(startMinute: number, durationMinutes: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24;
    const mm = String(m % 60).padStart(2, "0");
    return { text: `${h % 12 === 0 ? 12 : h % 12}:${mm}`, pm: h >= 12 };
  };
  const a = fmt(startMinute);
  const b = fmt(startMinute + durationMinutes);
  return a.pm === b.pm ? `${a.text} – ${b.text} ${b.pm ? "PM" : "AM"}` : `${a.text} ${a.pm ? "PM" : "AM"} – ${b.text} ${b.pm ? "PM" : "AM"}`;
}

/** Morning, afternoon or evening greeting for an hour of the day. */
export function greeting(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
