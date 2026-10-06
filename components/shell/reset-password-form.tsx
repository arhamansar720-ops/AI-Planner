"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="w-full max-w-[380px]"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }).catch(() => null);
        setLoading(false);
        if (res?.ok) router.push("/app");
        else {
          const data = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
          setError(data.error ?? "Couldn’t update your password. Please try again.");
        }
      }}
    >
      <Wordmark />
      <h1 className="mt-10 text-[26px] font-semibold tracking-[-0.03em]">Choose a new password</h1>
      <p className="mt-1.5 text-[14.5px] text-fg-muted">You’ll be signed out everywhere else.</p>
      <div className="mt-8 flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" required minLength={8} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-fg-subtle">At least 8 characters.</p>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-6 w-full rounded-xl">
        Save password
      </Button>
    </form>
  );
}
