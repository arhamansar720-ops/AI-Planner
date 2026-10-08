import assert from "node:assert/strict";
import { test } from "node:test";
import { tweekTasksToEvents } from "@/lib/connections/tweek";

test("Tweek tasks become events: dated, unfinished, with times when set", () => {
  const events = tweekTasksToEvents(
    [
      { id: "1", text: "Bio lab report", date: "2026-10-09" },
      { id: "2", text: "Call dentist", isoDate: "2026-10-10T15:30:00Z", dtStart: "2026-10-10T15:30:00Z", note: "Ask about Friday" },
      { id: "3", text: "Already done", date: "2026-10-09", done: true },
      { id: "4", text: "Someday idea" },
      { id: "5", text: "   ", date: "2026-10-09" },
      { id: "6", text: "Deleted", date: "2026-10-09", deleted: true },
    ],
    "School",
  );
  assert.deepEqual(events, [
    { title: "Bio lab report (School)", date: "2026-10-09", allDay: true, time: null, description: "" },
    { title: "Call dentist (School)", date: "2026-10-10", allDay: false, time: "15:30", description: "Ask about Friday" },
  ]);
});
