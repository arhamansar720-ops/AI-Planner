import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/shell/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

type Props = { searchParams: Promise<{ token?: string }> };

/** Reached from the reset email; the token in the link authorizes the change. */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) redirect("/login");
  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="app-grain pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="app-backdrop app-backdrop-mask absolute inset-0" />
      </div>
      <ResetPasswordForm token={token} />
    </main>
  );
}
