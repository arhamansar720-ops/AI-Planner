import "server-only";
import { z } from "zod";
import { DEFAULT_MODEL, MODELS } from "@/lib/config";
import type { ServerSupabase } from "./server";

export const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  model: z.string().refine((m) => MODELS.some((x) => x.id === m), "Unknown model"),
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
  model: DEFAULT_MODEL,
  planningStyle: "balanced",
  defaultDurationWeeks: null,
  dailyMinutes: 60,
  blockedWeekdays: [],
  responseStyle: "concise",
  weeklySummary: true,
  taskReminders: true,
};

export async function getPreferences(supabase: ServerSupabase, userId: string): Promise<Preferences> {
  const { data } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return DEFAULT_PREFERENCES;
  const parsed = PreferencesSchema.safeParse({
    theme: data.theme,
    model: data.model,
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

export async function updatePreferences(
  supabase: ServerSupabase,
  userId: string,
  patch: Partial<Preferences>,
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.model !== undefined) row.model = patch.model;
  if (patch.planningStyle !== undefined) row.planning_style = patch.planningStyle;
  if (patch.defaultDurationWeeks !== undefined) row.default_duration_weeks = patch.defaultDurationWeeks;
  if (patch.dailyMinutes !== undefined) row.daily_minutes = patch.dailyMinutes;
  if (patch.blockedWeekdays !== undefined) row.blocked_weekdays = patch.blockedWeekdays;
  if (patch.responseStyle !== undefined) row.response_style = patch.responseStyle;
  if (patch.weeklySummary !== undefined) row.weekly_summary = patch.weeklySummary;
  if (patch.taskReminders !== undefined) row.task_reminders = patch.taskReminders;
  const { error } = await supabase.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}
