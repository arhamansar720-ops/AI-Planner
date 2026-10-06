import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIcs, describeEvents, parseIcs, upcoming } from "@/lib/connections/ics";

const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:1",
  "DTSTART;VALUE=DATE:20261014",
  "SUMMARY:Bio lab report\\, section 2",
  "DESCRIPTION:Submit on Schoology\\nBring goggles",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:2",
  "DTSTART:20261012T153000Z",
  "SUMMARY:Unit 4 quiz in a very long title that keeps going and going so that it has t",
  " o be folded across lines",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:3",
  "DTSTART;TZID=America/Chicago:20261020T090000",
  "SUMMARY:Field trip",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:old",
  "DTSTART;VALUE=DATE:20250101",
  "SUMMARY:Old event",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:dup",
  "DTSTART;VALUE=DATE:20261014",
  "SUMMARY:Bio lab report\\, section 2",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("parseIcs reads all-day, UTC and local events, unfolding and unescaping", () => {
  const events = parseIcs(FEED);
  assert.equal(events.length, 5);
  assert.deepEqual(events[0], { title: "Bio lab report, section 2", date: "2026-10-14", time: null, allDay: true, description: "Submit on Schoology\nBring goggles" });
  assert.equal(events[1].title, "Unit 4 quiz in a very long title that keeps going and going so that it has to be folded across lines");
  assert.equal(events[1].time, "15:30 UTC");
  assert.deepEqual([events[2].date, events[2].time], ["2026-10-20", "09:00"]);
});

test("upcoming keeps the window, sorts and drops duplicates", () => {
  const list = upcoming(parseIcs(FEED), "2026-10-06", 30);
  assert.deepEqual(list.map((e) => e.title.slice(0, 10)), ["Unit 4 qui", "Bio lab re", "Field trip"]);
  assert.match(describeEvents("Schoology", list), /^Upcoming from Schoology[\s\S]*- Wed, Oct 14: Bio lab report, section 2/);
});

test("buildIcs writes a valid, round-trippable calendar", () => {
  const ics = buildIcs("Finals; week", [
    { uid: "a@forma", title: "Review chapters 1, 2 and 3; then quiz yourself on everything you missed last time", start: "2026-10-07", end: "2026-10-09" },
  ]);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART;VALUE=DATE:20261007\r\nDTEND;VALUE=DATE:20261010/);
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75));
  const back = parseIcs(ics);
  assert.equal(back[0].title, "Review chapters 1, 2 and 3; then quiz yourself on everything you missed last time");
});
