import { connection } from "next/server";
import { pickHeading } from "@/components/home/phrases";
import { PlannerExperience } from "@/components/planner/planner-experience";
import { DEFAULT_MODEL } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/db/env";
import { listPlans } from "@/lib/db/plans";
import { getPreferences } from "@/lib/db/preferences";
import { getSession } from "@/lib/db/server";
import { getNavUser } from "@/lib/db/user";

export default async function HomePage() {
  await connection(); // per-request: session, preferences and a fresh heading
  let user = null;
  let model = DEFAULT_MODEL;
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
      model = prefs.model;
      recentPlans = plans;
    }
  }

  return (
    <PlannerExperience
      user={user}
      initialHeading={pickHeading()}
      defaultModel={model}
      recentPlans={recentPlans}
    />
  );
}
