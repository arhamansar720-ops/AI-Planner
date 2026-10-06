import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PersonalizeView } from "@/components/personalize/personalize-view";
import { TopNav } from "@/components/shell/top-nav";
import { publicConnection, readConnections } from "@/lib/connections/store";
import { getSession } from "@/lib/auth/session";
import { getAccountSetup, getNavUser } from "@/lib/db/user";

export const metadata: Metadata = { title: "Personalize" };

export default async function PersonalizePage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/personalize");
  const navUser = await getNavUser(user);

  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <PersonalizeView
        name={navUser?.name ?? ""}
        persona={getAccountSetup(user).persona}
        connections={readConnections(user).map(publicConnection)}
      />
    </div>
  );
}
