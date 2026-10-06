import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/shell/login-form";
import { Wordmark } from "@/components/ui/brand";
import { emailConfigured } from "@/lib/auth/email";
import { enabledProviders } from "@/lib/auth/oauth";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/env";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Sign in" };

const LOGIN_ERRORS: Record<string, string> = {
  link: "That sign-in didn’t complete. Please try again.",
  provider: "That sign-in option isn’t available yet. Use your email for now.",
  email: "We couldn’t get an email address from that account.",
  exists: "An account with that email already exists. Sign in with your password.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string; mode?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, mode } = await searchParams;
  if (isDatabaseConfigured() && (await getSession()).user) redirect(safeNext(next));

  return (
    <main id="main" className="relative flex min-h-dvh">
      <div className="app-grain pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="app-backdrop app-backdrop-mask absolute inset-0" />
      </div>
      {isDatabaseConfigured() ? (
        <LoginForm
          next={safeNext(next)}
          initialError={error ? (LOGIN_ERRORS[error] ?? LOGIN_ERRORS.link) : null}
          initialMode={mode === "signup" ? "signup" : "signin"}
          providers={enabledProviders()}
          canReset={emailConfigured()}
          demoAccount={(process.env.DEMO_ADMIN_PASSWORD ?? "").length >= 8}
        />
      ) : (
        <div className="m-auto w-full max-w-[420px] px-6">
          <Wordmark />
          <h1 className="mt-10 text-[22px] font-semibold tracking-[-0.025em]">The database isn’t configured</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Set <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">DATABASE_URL</code> to a Postgres database
            (Render Postgres works) and restart the server. The schema is applied automatically on start. See the README for
            details.
          </p>
        </div>
      )}
    </main>
  );
}
