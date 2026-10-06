import { redirect } from "next/navigation";
import { connection } from "next/server";
import { pickHeading } from "@/components/home/phrases";
import { PlannerExperience } from "@/components/planner/planner-experience";
import { isDatabaseConfigured } from "@/lib/db/env";
import { listPlans } from "@/lib/db/plans";
import { DEFAULT_PREFERENCES, getPreferences } from "@/lib/db/preferences";
import { getSession } from "@/lib/auth/session";
import { getAccountSetup, getNavUser } from "@/lib/db/user";
import type { PersonaId } from "@/lib/personas";

export default async function HomePage() {
  await connection(); // per-request: session, preferences and a fresh heading
  let user = null;
  let preferences = DEFAULT_PREFERENCES;
  let recentPlans: Awaited<ReturnType<typeof listPlans>> = [];
  let persona: PersonaId | null = null;

  if (isDatabaseConfigured()) {
    const session = await getSession();
    if (session.user) {
      const setup = getAccountSetup(session.user);
      // New accounts pick a mode, pace and voice first.
      if (!setup.onboarded) redirect("/setup");
      persona = setup.persona;
      const [navUser, prefs, plans] = await Promise.all([
        getNavUser(session.user),
        getPreferences(session.user.id),
        listPlans(session.user.id).catch(() => []),
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
        persona,
      }}
      recentPlans={recentPlans}
    />
  );
}
