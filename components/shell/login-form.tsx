"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { getSupabaseBrowser } from "@/lib/db/browser";
import { ease } from "@/lib/motion";

type Mode = "signin" | "signup";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "That sign-in link has expired. Please sign in again." : null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowser();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message.toLowerCase().includes("confirm") ? "Please confirm your email first — check your inbox." : "That email and password don’t match.");
          return;
        }
        window.location.assign(next);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: { display_name: name.trim() || undefined },
          },
        });
        if (error) {
          setError(error.message.includes("already") ? "An account with that email already exists." : error.message);
          return;
        }
        if (data.session) window.location.assign(next);
        else setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px]">
      <Link href="/" className="mb-10 inline-flex">
        <Wordmark />
      </Link>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ease.expo }}>
            <MailCheck className="size-6 text-accent" />
            <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.025em]">Check your email</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              We sent a confirmation link to <span className="text-fg">{email}</span>. Open it to finish creating your account.
            </p>
          </motion.div>
        ) : (
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: ease.expo }}>
            <h1 className="text-[22px] font-semibold tracking-[-0.025em]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {mode === "signin" ? "Sign in to pick up where you left off." : "Turn an idea into a plan."}
            </p>
            <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby={mode === "signup" ? "password-hint" : undefined}
                />
                {mode === "signup" && <p id="password-hint" className="text-xs text-fg-subtle">At least 8 characters.</p>}
              </div>
              {error && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2">
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-fg-muted">
              {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
                className="font-medium text-fg underline-offset-4 hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
