import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/shell/login-form";
import { DEMO_DEFAULT_PASSWORD, DEMO_EMAIL, demoPassword } from "@/lib/auth/demo";
import { emailConfigured } from "@/lib/auth/email";
import { enabledProviders } from "@/lib/auth/oauth";
import { getSession } from "@/lib/auth/session";
import { isEmbeddedDatabase } from "@/lib/db/env";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Sign in" };

const LOGIN_ERRORS: Record<string, string> = {
  link: "That sign-in didn’t complete. Please try again.",
  provider: "That sign-in option isn’t available yet. Use your email for now.",
  email: "We couldn’t get an email address from that account.",
  exists: "An account with that email already exists. Sign in with your password.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string; mode?: string }> };

/** The test account's sign-in, shown on the form only while it uses the published default password. */
function demoAccount() {
  const password = demoPassword();
  if (!password) return null;
  return { email: DEMO_EMAIL, password: password === DEMO_DEFAULT_PASSWORD ? password : null };
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, mode } = await searchParams;
  if ((await getSession()).user) redirect(safeNext(next));

  return (
    <main id="main" className="relative flex min-h-dvh">
      <div className="app-grain pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="app-backdrop app-backdrop-mask absolute inset-0" />
      </div>
      <LoginForm
        next={safeNext(next)}
        initialError={error ? (LOGIN_ERRORS[error] ?? LOGIN_ERRORS.link) : null}
        initialMode={mode === "signup" ? "signup" : "signin"}
        providers={enabledProviders()}
        canReset={emailConfigured()}
        demoAccount={demoAccount()}
        temporaryData={isEmbeddedDatabase()}
      />
    </main>
  );
}
