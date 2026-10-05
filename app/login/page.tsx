import type { Metadata } from "next";
import { LoginForm } from "@/components/shell/login-form";
import { Wordmark } from "@/components/ui/brand";
import { isSupabaseConfigured } from "@/lib/db/env";
import { safeNext } from "@/lib/utils/safe-next";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;

  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="app-backdrop app-backdrop-mask pointer-events-none fixed inset-0 -z-10" aria-hidden />
      {isSupabaseConfigured() ? (
        <LoginForm next={safeNext(next)} linkError={error === "link"} />
      ) : (
        <div className="w-full max-w-[420px]">
          <Wordmark />
          <h1 className="mt-10 text-[22px] font-semibold tracking-[-0.025em]">Authentication isn’t configured</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Set <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in your
            environment, apply the migration in <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">supabase/migrations</code>,
            and restart the server. See the README for details.
          </p>
        </div>
      )}
    </main>
  );
}
