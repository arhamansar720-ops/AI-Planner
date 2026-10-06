"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Input, Label } from "@/components/ui/field";
import { ease } from "@/lib/motion";
import { PERSONAS } from "@/lib/personas";

type Mode = "signin" | "signup" | "forgot";
type Provider = "google" | "microsoft";

const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", microsoft: "Microsoft" };

export function LoginForm({
  next,
  initialError,
  initialMode,
  providers,
  canReset,
  demoAccount,
}: {
  next: string;
  initialError: string | null;
  initialMode: "signin" | "signup";
  providers: Record<Provider, boolean>;
  canReset: boolean;
  demoAccount: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<null | "email" | Provider>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [sent, setSent] = useState<null | "reset">(null);

  const oauth = async (provider: Provider) => {
    setError(null);
    if (!providers[provider]) {
      setError(`${PROVIDER_LABEL[provider]} sign-in isn’t available yet. Use your email for now.`);
      return;
    }
    setLoading(provider);
    // A full navigation: the server redirects on to Google or Microsoft.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/auth/oauth/${provider}?next=${encodeURIComponent(next)}`);
  };

  const post = async (path: string, body: object) => {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      if (mode === "forgot") {
        await post("/api/auth/reset-request", { email });
        setSent("reset");
      } else if (mode === "signin") {
        await post("/api/auth/signin", { email, password });
        window.location.assign(next);
      } else {
        await post("/api/auth/signup", { email, password, name: name.trim() || undefined });
        window.location.assign(next);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const anyProvider = providers.google || providers.microsoft;

  return (
    <div className="grid w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <BrandPanel />
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="inline-flex self-start rounded-lg py-1 transition-opacity hover:opacity-80 lg:hidden" aria-label="Forma home">
          <Wordmark />
        </Link>
        <div className="m-auto w-full max-w-[380px] py-10">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ease.expo }}>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <MailCheck className="size-6" />
                </span>
                <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em]">Check your email</h1>
                <p className="mt-2 text-[14.5px] leading-relaxed text-fg-muted">
                  If there’s an account for <span className="text-fg">{email}</span>, we’ve sent it a link to choose a new
                  password. It expires in an hour.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(null);
                    setMode("signin");
                  }}
                  className="mt-6 inline-flex items-center gap-1 text-[13px] font-medium text-fg-muted hover:text-fg"
                >
                  <ArrowLeft className="size-3.5" /> Back to sign in
                </button>
              </motion.div>
            ) : (
              <motion.div key={mode === "forgot" ? "forgot" : "main"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: ease.expo }}>
                {mode === "forgot" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="mb-6 inline-flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg"
                    >
                      <ArrowLeft className="size-3.5" /> Back
                    </button>
                    <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Reset your password</h1>
                    <p className="mt-1.5 text-[14.5px] text-fg-muted">We’ll email you a link to choose a new one.</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-[26px] font-semibold tracking-[-0.03em]">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
                    <p className="mt-1.5 text-[14.5px] text-fg-muted">
                      {mode === "signin" ? "Sign in to pick up where you left off." : "Free, and your AI runs on your own device."}
                    </p>
                    <Segmented
                      label="Sign in or create an account"
                      className="mt-6 grid w-full grid-cols-2"
                      value={mode}
                      onChange={(m) => {
                        setMode(m);
                        setError(null);
                      }}
                      options={[
                        { value: "signin", label: "Sign in" },
                        { value: "signup", label: "Create account" },
                      ]}
                    />
                    <div className="mt-6 flex flex-col gap-2.5">
                      <OAuthButton provider="google" loading={loading === "google"} disabled={loading !== null} enabled={providers.google} onClick={() => oauth("google")} />
                      <OAuthButton provider="microsoft" loading={loading === "microsoft"} disabled={loading !== null} enabled={providers.microsoft} onClick={() => oauth("microsoft")} />
                    </div>
                    <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle" aria-hidden>
                      <span className="h-px flex-1 bg-border" />
                      {anyProvider ? "or with email" : "with email"}
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                <form onSubmit={submit} className={mode === "forgot" ? "mt-8 flex flex-col gap-4" : "flex flex-col gap-4"}>
                  {mode === "signup" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">{mode === "signin" ? "Email or username" : "Email"}</Label>
                    <Input
                      id="email"
                      type={mode === "signin" ? "text" : "email"}
                      required
                      autoComplete={mode === "signin" ? "username" : "email"}
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {mode !== "forgot" && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <Label htmlFor="password">Password</Label>
                        {mode === "signin" && canReset && (
                          <button type="button" onClick={() => setMode("forgot")} className="text-xs text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                            Forgot password?
                          </button>
                        )}
                      </div>
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
                      {mode === "signup" && (
                        <p id="password-hint" className="text-xs text-fg-subtle">
                          At least 8 characters.
                        </p>
                      )}
                    </div>
                  )}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <Button type="submit" variant="primary" size="lg" loading={loading === "email"} disabled={loading !== null} className="mt-1 rounded-xl">
                    {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                  </Button>
                </form>
                {mode === "signin" && demoAccount && (
                  <p className="mt-5 rounded-xl border border-dashed border-border-strong px-3 py-2.5 text-center text-xs leading-relaxed text-fg-muted">
                    Testing? Sign in with the username{" "}
                    <button type="button" onClick={() => setEmail("admin")} className="font-mono font-medium text-fg underline underline-offset-2">
                      admin
                    </button>{" "}
                    and the test password set for this site.
                  </p>
                )}
                {mode === "signup" && (
                  <p className="mt-5 text-center text-xs leading-relaxed text-fg-subtle">
                    Your plans are private to your account.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function OAuthButton({
  provider,
  enabled,
  loading,
  disabled,
  onClick,
}: {
  provider: Provider;
  enabled: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      loading={loading}
      disabled={disabled}
      onClick={onClick}
      aria-describedby={enabled ? undefined : `${provider}-off`}
      className="relative w-full rounded-xl text-[14.5px]"
    >
      {provider === "google" ? <GoogleMark /> : <MicrosoftMark />}
      Continue with {PROVIDER_LABEL[provider]}
      {!enabled && (
        <span id={`${provider}-off`} className="sr-only">
          (not available yet)
        </span>
      )}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="!size-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden className="!size-4">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const PREVIEW_TASKS = ["Pick a race and register", "Get fitted for running shoes", "Run four easy sessions", "Grow the long run to 8 miles"];

/** The left half on large screens: a small, living preview of a plan. */
function BrandPanel() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setDone((d) => (d + 1) % (PREVIEW_TASKS.length + 2)), 1400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-10" aria-hidden>
      <div className="pointer-events-none absolute -left-24 top-1/3 h-[420px] w-[520px] rounded-full bg-accent opacity-[0.1] blur-[110px] dark:opacity-[0.18]" />
      <Link href="/" className="relative inline-flex self-start rounded-lg py-1 transition-opacity hover:opacity-80" tabIndex={-1}>
        <Wordmark />
      </Link>
      <div className="relative max-w-[440px]">
        <h2 className="text-[clamp(2rem,3.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
          One sentence in.
          <br />
          <span className="text-accent">A plan that keeps up.</span>
        </h2>
        <div className="glass mt-10 rounded-3xl p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">First Half Marathon</p>
          <ul className="mt-3 flex flex-col gap-2">
            {PREVIEW_TASKS.map((t, i) => {
              const checked = i < done;
              return (
                <li key={t} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-[13.5px]">
                  <motion.span
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full border"
                    animate={{
                      backgroundColor: checked ? "var(--accent)" : "rgba(0,0,0,0)",
                      borderColor: checked ? "var(--accent)" : "var(--border-strong)",
                      scale: checked ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                  >
                    {checked && <Check className="size-3 text-accent-fg" strokeWidth={3} />}
                  </motion.span>
                  <span className={checked ? "text-fg-subtle line-through decoration-fg-subtle/50" : "text-fg"}>{t}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="relative flex items-center gap-2 text-[13px] text-fg-muted">
        <span className="flex gap-1 text-[17px]">
          {PERSONAS.map((p) => (
            <span key={p.id}>{p.emoji}</span>
          ))}
        </span>
        Made for students, professionals, founders, creators and more.
      </p>
    </aside>
  );
}
