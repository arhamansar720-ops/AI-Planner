import { MarketingFooter, MarketingNav } from "@/components/landing/shell";
import { isDatabaseConfigured } from "@/lib/db/env";
import { getSession } from "@/lib/auth/session";
import { getNavUser } from "@/lib/db/user";

/** The public site: landing, features, how it works and pricing. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  if (isDatabaseConfigured()) {
    const session = await getSession();
    user = session.user ? await getNavUser(session.user) : null;
  }
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-20" aria-hidden>
        <div className="app-grain absolute inset-0">
          <div className="app-backdrop app-backdrop-mask absolute inset-0" />
        </div>
      </div>
      <MarketingNav user={user} />
      {children}
      <MarketingFooter />
    </div>
  );
}
