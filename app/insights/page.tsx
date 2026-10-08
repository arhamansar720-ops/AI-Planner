import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InsightsView } from "@/components/insights/insights-view";
import { TopNav } from "@/components/shell/top-nav";
import { getSession } from "@/lib/auth/session";
import { getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Insights" };

/** Progress across every plan. Data loads in the browser, which knows the local date and zone. */
export default async function InsightsPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/insights");
  return (
    <div className="min-h-dvh">
      <TopNav user={getNavUser(user)} />
      <InsightsView />
    </div>
  );
}
