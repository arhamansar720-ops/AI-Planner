import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/shell/reset-password-form";
import { getSession } from "@/lib/db/server";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the reset email, after /auth/callback has signed the person in. */
export default async function ResetPasswordPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?error=link");
  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="app-grain pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="app-backdrop app-backdrop-mask absolute inset-0" />
      </div>
      <ResetPasswordForm email={user.email ?? ""} />
    </main>
  );
}
