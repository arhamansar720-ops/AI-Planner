import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { TopNav } from "@/components/shell/top-nav";
import { getPreferences } from "@/lib/db/preferences";
import { getSession } from "@/lib/auth/session";
import { getAccountSetup, getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/settings");
  const [prefs, navUser] = await Promise.all([getPreferences(user.id), getNavUser(user)]);

  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <main id="main" className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Settings</h1>
        <p className="mb-10 mt-1 text-sm text-fg-muted">Your account, appearance, voice and how the AI plans for you.</p>
        <SettingsForm email={user.email ?? ""} displayName={navUser?.name ?? ""} initial={prefs} persona={getAccountSetup(user).persona} />
      </main>
    </div>
  );
}
