import "server-only";
import { z } from "zod";
import { query } from "./pool";

export const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  planningStyle: z.enum(["balanced", "ambitious", "gentle"]),
  defaultDurationWeeks: z.number().int().min(1).max(104).nullable(),
  dailyMinutes: z.number().int().min(10).max(960),
  blockedWeekdays: z.array(z.number().int().min(0).max(6)).max(6),
  responseStyle: z.enum(["concise", "detailed"]),
  weeklySummary: z.boolean(),
  taskReminders: z.boolean(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  planningStyle: "balanced",
  defaultDurationWeeks: null,
  dailyMinutes: 60,
  blockedWeekdays: [],
  responseStyle: "concise",
  weeklySummary: true,
  taskReminders: true,
};

export async function getPreferences(userId: string): Promise<Preferences> {
  const { rows } = await query(`select * from user_preferences where user_id = $1`, [userId]);
  const data = rows[0];
  if (!data) return DEFAULT_PREFERENCES;
  const parsed = PreferencesSchema.safeParse({
    theme: data.theme,
    planningStyle: data.planning_style,
    defaultDurationWeeks: data.default_duration_weeks,
    dailyMinutes: data.daily_minutes,
    blockedWeekdays: data.blocked_weekdays ?? [],
    responseStyle: data.response_style,
    weeklySummary: data.weekly_summary,
    taskReminders: data.task_reminders,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_PREFERENCES, ...(parsed.data ?? {}) };
}

export async function updatePreferences(userId: string, patch: Partial<Preferences>): Promise<void> {
  const columns: Record<string, unknown> = {};
  if (patch.theme !== undefined) columns.theme = patch.theme;
  if (patch.planningStyle !== undefined) columns.planning_style = patch.planningStyle;
  if (patch.defaultDurationWeeks !== undefined) columns.default_duration_weeks = patch.defaultDurationWeeks;
  if (patch.dailyMinutes !== undefined) columns.daily_minutes = patch.dailyMinutes;
  if (patch.blockedWeekdays !== undefined) columns.blocked_weekdays = patch.blockedWeekdays;
  if (patch.responseStyle !== undefined) columns.response_style = patch.responseStyle;
  if (patch.weeklySummary !== undefined) columns.weekly_summary = patch.weeklySummary;
  if (patch.taskReminders !== undefined) columns.task_reminders = patch.taskReminders;
  const names = Object.keys(columns);
  if (!names.length) return;
  // Column names come from the fixed list above, never from input.
  await query(
    `insert into user_preferences (user_id, ${names.join(", ")}) values ($1, ${names.map((_, i) => `$${i + 2}`).join(", ")})
     on conflict (user_id) do update set ${names.map((n) => `${n} = excluded.${n}`).join(", ")}, updated_at = now()`,
    [userId, ...Object.values(columns)],
  );
}
