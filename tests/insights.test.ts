import assert from "node:assert/strict";
import { test } from "node:test";
import { currentStreak, fillDays, intensity, longestStreak, weekColumns } from "@/lib/planning/insights";

test("fillDays fills gaps with zero", () => {
  assert.deepEqual(fillDays([{ date: "2026-10-02", value: 30 }], "2026-10-01", "2026-10-03"), [
    { date: "2026-10-01", value: 0 },
    { date: "2026-10-02", value: 30 },
    { date: "2026-10-03", value: 0 },
  ]);
});

test("streaks count consecutive days and forgive an empty today", () => {
  const days = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-01"];
  assert.equal(currentStreak(days, "2026-10-08"), 4);
  assert.equal(currentStreak([...days, "2026-10-08"], "2026-10-08"), 5);
  assert.equal(currentStreak(["2026-10-05"], "2026-10-08"), 0);
  assert.equal(longestStreak(days), 4);
  assert.equal(longestStreak([]), 0);
});

test("intensity steps and Monday-start week columns", () => {
  assert.deepEqual([0, 10, 30, 60, 100].map((v) => intensity(v, 100)), [0, 1, 2, 3, 4]);
  // 2026-10-07 is a Wednesday: two blank cells lead the first column.
  const cols = weekColumns(fillDays([], "2026-10-07", "2026-10-13"));
  assert.equal(cols.length, 2);
  assert.equal(cols[0][0], null);
  assert.equal(cols[0][2]?.date, "2026-10-07");
  assert.equal(cols[1][0]?.date, "2026-10-12");
  assert.equal(cols[1][2], null);
});
