import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupFlow } from "@/components/setup/setup-flow";
import { getPreferences } from "@/lib/db/preferences";
import { getSession } from "@/lib/auth/session";
import { getAccountSetup, getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Set up" };

export default async function SetupPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/setup");
  const [prefs, navUser] = await Promise.all([getPreferences(user.id), getNavUser(user)]);
  const setup = getAccountSetup(user);

  return (
    <SetupFlow
      name={navUser?.name ?? ""}
      returning={setup.onboarded}
      initial={{
        persona: setup.persona,
        dailyMinutes: prefs.dailyMinutes,
        planningStyle: prefs.planningStyle,
        blockedWeekdays: prefs.blockedWeekdays,
      }}
    />
  );
}
