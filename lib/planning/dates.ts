/**
 * Calendar-date helpers. Plans store dates as `YYYY-MM-DD` strings with no
 * time zone; all arithmetic happens in UTC so results are identical on the
 * server and in every browser.
 */

const DAY_MS = 86_400_000;

export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return formatISODate(new Date(parseDate(value).getTime() + days * DAY_MS));
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / DAY_MS);
}

export function weekday(value: string): number {
  return parseDate(value).getUTCDay();
}

export function minDate(a: string, b: string) {
  return a < b ? a : b;
}

export function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatISODate(parseDate(value)) === value;
}

/** Today's date in the runtime's local zone (use in the browser). */
export function localToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const weekdayNames = { short: WEEKDAYS_SHORT, long: WEEKDAYS_LONG };
export const monthNames = { short: MONTHS_SHORT, long: MONTHS_LONG };

/** "Jun 20" */
export function formatShort(value: string): string {
  const d = parseDate(value);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Mon, Jun 20" */
export function formatWithWeekday(value: string): string {
  const d = parseDate(value);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "June 20, 2026" */
export function formatLong(value: string): string {
  const d = parseDate(value);
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatShort(start);
  const s = parseDate(start);
  const e = parseDate(end);
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${MONTHS_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  }
  return `${formatShort(start)} – ${formatShort(end)}`;
}

/** Human duration between two inclusive dates: "12 weeks", "5 days". */
export function formatSpan(start: string, end: string): string {
  const days = diffDays(end, start) + 1;
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks} weeks`;
  const months = Math.round(days / 30.4);
  return `${months} months`;
}

/** "Week 3" relative to a plan start. */
export function weekIndex(planStart: string, value: string): number {
  return Math.floor(diffDays(value, planStart) / 7) + 1;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 540 → "9:00 AM" */
export function formatClock(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function startOfWeek(value: string): string {
  return addDays(value, -weekday(value));
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

export function addMonths(value: string, months: number): string {
  const d = parseDate(value);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  return formatISODate(target);
}
