import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock } from "@/components/focus/clock";
import { dueReminders, formatRange, greeting, nextReminderDelay, type ReminderSession } from "@/lib/planning/reminders";

const s = (id: string, startMinute: number, extra: Partial<ReminderSession> = {}): ReminderSession => ({
  id,
  date: "2026-10-07",
  startMinute,
  durationMinutes: 45,
  taskStatus: "todo",
  ...extra,
});

test("dueReminders fires five minutes ahead and skips sent, done, late and other days", () => {
  const sessions = [
    s("soon", 540),
    s("later", 600),
    s("done", 540, { taskStatus: "done" }),
    s("tomorrow", 540, { date: "2026-10-08" }),
    s("past", 500),
    s("sent", 538),
  ];
  const due = dueReminders(sessions, "2026-10-07", 535, new Set(["sent"]));
  assert.deepEqual(
    due.map((x) => x.id),
    ["soon"],
  );
  // Without the sent set, the 8:58 session is due as well.
  assert.deepEqual(
    dueReminders(sessions, "2026-10-07", 535, new Set()).map((x) => x.id),
    ["soon", "sent"],
  );
});

test("nextReminderDelay points at the next lead time", () => {
  const now = new Date(2026, 9, 7, 8, 50, 30);
  assert.equal(nextReminderDelay([s("a", 540), s("b", 600)], "2026-10-07", now, new Set()), (5 * 60 - 30) * 1000 - 0);
  assert.equal(nextReminderDelay([s("a", 540)], "2026-10-07", now, new Set(["a"])), null);
  assert.equal(nextReminderDelay([s("a", 400)], "2026-10-07", now, new Set()), null);
});

test("formatRange and greeting read naturally", () => {
  assert.equal(formatRange(540, 45), "9:00 – 9:45 AM");
  assert.equal(formatRange(690, 60), "11:30 AM – 12:30 PM");
  assert.equal(formatRange(780, 30), "1:00 – 1:30 PM");
  assert.equal(greeting(8), "Good morning");
  assert.equal(greeting(14), "Good afternoon");
  assert.equal(greeting(20), "Good evening");
});

test("formatClock counts down in minutes and seconds", () => {
  assert.equal(formatClock(25 * 60000), "25:00");
  assert.equal(formatClock(61_000), "1:01");
  assert.equal(formatClock(400), "0:01");
  assert.equal(formatClock(0), "0:00");
});
