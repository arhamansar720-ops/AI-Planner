"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Menu as MenuIcon, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "@/components/shell/theme";
import { UserMenu, type MenuUser } from "@/components/shell/user-menu";
import { Wordmark } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/overlays";
import { product } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

export const MARKETING_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Whether the dark theme is applied (a class on <html>); false while hydrating. */
function useIsDark() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

export function MarketingNav({ user }: { user: MenuUser | null }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const surface = useTransform(scrollY, [0, 40], [0, 1]);
  const { setTheme } = useTheme();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <motion.div style={{ opacity: surface }} className="glass absolute inset-0 rounded-none border-x-0 border-t-0" aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-4 sm:px-5">
        <Link href="/" className="-ml-1 rounded-lg px-1 py-1 transition-opacity hover:opacity-80" aria-label={`${product.name} home`}>
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {MARKETING_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative rounded-full px-3.5 py-1.5 text-[14px] transition-colors", active ? "text-fg" : "text-fg-muted hover:text-fg")}
              >
                {active && (
                  <motion.span
                    layoutId="marketing-nav-active"
                    className="absolute inset-0 -z-10 rounded-full bg-surface shadow-xs ring-1 ring-border"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(dark ? "light" : "dark")}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          {user ? (
            <>
              <Button asChild variant="primary" size="sm" className="rounded-full px-4">
                <Link href="/app">Open app</Link>
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="primary" size="sm" className="rounded-full px-4">
                <Link href="/login?mode=signup">Get started</Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <MenuIcon />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="right" title="Menu" className="w-[min(320px,85vw)] p-4 pt-14">
          <nav className="mt-2 flex flex-col gap-1" aria-label="Main">
            <Link href="/" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-[16px] hover:bg-surface-2">
              Home
            </Link>
            {MARKETING_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={pathname === href ? "page" : undefined}
                className={cn("rounded-xl px-3 py-3 text-[16px] hover:bg-surface-2", pathname === href && "bg-surface-2 font-medium")}
              >
                {label}
              </Link>
            ))}
            <div className="my-3 h-px bg-border" />
            {user ? (
              <Link href="/app" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-[16px] hover:bg-surface-2">
                Open app
              </Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-[16px] hover:bg-surface-2">
                Sign in
              </Link>
            )}
          </nav>
        </SheetContent>
      </Dialog>
    </header>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-4 pb-10 pt-14 sm:px-5 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-[280px] text-[14px] leading-relaxed text-fg-muted">
            {product.tagline} Planning that runs on your own device and keeps up with your weeks.
          </p>
          <Link
            href="/login?mode=signup"
            className="group mt-1 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-fg transition-colors hover:text-accent"
          >
            Start planning <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <FooterColumn
          title="Product"
          links={[
            ["/features", "Features"],
            ["/how-it-works", "How it works"],
            ["/pricing", "Pricing"],
          ]}
        />
        <FooterColumn
          title="Features"
          links={[
            ["/features#connections", "Connections"],
            ["/features#voice", "Voice"],
            ["/features#privacy", "Privacy"],
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            ["/login", "Sign in"],
            ["/login?mode=signup", "Create account"],
            ["/app", "Open the app"],
          ]}
        />
      </div>
      <div className="mx-auto flex max-w-[1120px] flex-col gap-2 border-t border-border px-4 py-6 font-mono text-[11.5px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>
          © {year} {product.name}
        </span>
        <span>
          Animations from{" "}
          <a href="https://reactbits.dev" className="underline underline-offset-2 hover:text-fg">
            React Bits
          </a>
        </span>
      </div>
      {/* An oversized, quiet wordmark to close the page. */}
      <p
        className="pointer-events-none select-none px-4 text-center text-[clamp(5rem,22vw,17rem)] font-semibold leading-[0.75] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_var(--border-strong)] [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
        aria-hidden
      >
        {product.name}
      </p>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle">{title}</p>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="text-fg-muted transition-colors hover:text-fg">
          {label}
        </Link>
      ))}
    </div>
  );
}
