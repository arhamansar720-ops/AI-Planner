import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/shell/top-nav";
import { TodayView } from "@/components/today/today-view";
import { getSession } from "@/lib/auth/session";
import { getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Today" };

/** The day's work across every plan. Data loads in the browser, which knows the local date. */
export default async function TodayPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/today");
  const navUser = getNavUser(user);
  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <TodayView firstName={navUser?.name.split(" ")[0] ?? ""} />
    </div>
  );
}
