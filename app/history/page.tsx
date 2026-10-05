import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HistoryList } from "@/components/history/history-list";
import { TopNav } from "@/components/shell/top-nav";
import { listPlans } from "@/lib/db/plans";
import { getSession } from "@/lib/db/server";
import { getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/history");
  const [plans, navUser] = await Promise.all([listPlans(supabase), getNavUser(supabase, user)]);

  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <main id="main" className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-10 sm:pt-14">
        <h1 className="px-3 text-[26px] font-semibold tracking-[-0.03em]">History</h1>
        <p className="mb-10 mt-1 px-3 text-sm text-fg-muted">Every plan you’ve made, most recent first.</p>
        <HistoryList plans={plans} />
      </main>
    </div>
  );
}
