import { connection } from "next/server";
import { pickHeading } from "@/components/home/phrases";
import { PlannerExperience } from "@/components/planner/planner-experience";
import { isSupabaseConfigured } from "@/lib/db/env";
import { listPlans } from "@/lib/db/plans";
import { DEFAULT_PREFERENCES, getPreferences } from "@/lib/db/preferences";
import { getSession } from "@/lib/db/server";
import { getNavUser } from "@/lib/db/user";

export default async function HomePage() {
  await connection(); // per-request: session, preferences and a fresh heading
  let user = null;
  let preferences = DEFAULT_PREFERENCES;
  let recentPlans: Awaited<ReturnType<typeof listPlans>> = [];

  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session.user) {
      const [navUser, prefs, plans] = await Promise.all([
        getNavUser(session.supabase, session.user),
        getPreferences(session.supabase, session.user.id),
        listPlans(session.supabase).catch(() => []),
      ]);
      user = navUser;
      preferences = prefs;
      recentPlans = plans;
    }
  }

  return (
    <PlannerExperience
      user={user}
      initialHeading={pickHeading()}
      preferences={{
        planningStyle: preferences.planningStyle,
        defaultDurationWeeks: preferences.defaultDurationWeeks,
        dailyMinutes: preferences.dailyMinutes,
        blockedWeekdays: preferences.blockedWeekdays,
        responseStyle: preferences.responseStyle,
      }}
      recentPlans={recentPlans}
    />
  );
}
