/**
 * Pure helpers for the Insights page: filling day ranges, streaks and
 * summaries. Dates are "YYYY-MM-DD" in the person's local calendar.
 */
import { addDays, diffDays } from "./dates";

export type DayValue = { date: string; value: number };

/** One entry per day from `from` to `to` inclusive, zero where there's no data. */
export function fillDays(rows: DayValue[], from: string, to: string): DayValue[] {
  const byDate = new Map(rows.map((r) => [r.date, r.value]));
  const out: DayValue[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, value: byDate.get(d) ?? 0 });
  return out;
}

/**
 * Consecutive active days ending today, or ending yesterday when today has
 * nothing yet (so the streak doesn't look broken first thing in the morning).
 */
export function currentStreak(activeDays: Iterable<string>, today: string): number {
  const set = new Set(activeDays);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** The longest run of consecutive active days. */
export function longestStreak(activeDays: Iterable<string>): number {
  const days = [...new Set(activeDays)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && diffDays(days[i], days[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Five intensity steps (0 = none) for a heatmap cell, relative to the busiest day. */
export function intensity(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const r = value / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

/** Monday-start weeks covering `from`..`to`, each with seven days (null outside the range). */
export function weekColumns(days: DayValue[]): (DayValue | null)[][] {
  if (!days.length) return [];
  const first = days[0].date;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const cells: (DayValue | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const cols: (DayValue | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  return cols;
}
