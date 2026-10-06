"use client";

import { Download, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui/button";
import { Segmented, Switch } from "@/components/ui/controls";
import { Input, Select } from "@/components/ui/field";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { LocalModelSettings } from "@/components/settings/local-model-settings";
import { getPersona, type PersonaId } from "@/lib/personas";
import { PLANNING_STYLES } from "@/lib/config";
import { getSupabaseBrowser } from "@/lib/db/browser";
import { formatMinutes, weekdayNames } from "@/lib/planning/dates";
import { cn } from "@/lib/utils/cn";

export type SettingsPreferences = {
  theme: "light" | "dark" | "system";
  planningStyle: "balanced" | "ambitious" | "gentle";
  defaultDurationWeeks: number | null;
  dailyMinutes: number;
  blockedWeekdays: number[];
  responseStyle: "concise" | "detailed";
  weeklySummary: boolean;
  taskReminders: boolean;
};

const SECTIONS = ["Account", "Appearance", "AI", "Notifications", "Data"] as const;

export function SettingsForm({
  email,
  displayName,
  userId,
  initial,
  persona: personaId,
}: {
  email: string;
  displayName: string;
  userId: string;
  initial: SettingsPreferences;
  persona: PersonaId | null;
}) {
  const persona = getPersona(personaId);
  const [prefs, setPrefs] = useState(initial);
  const [name, setName] = useState(displayName);
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const syncedTheme = useRef(false);

  // The account preference wins on this device the first time settings load.
  useEffect(() => {
    if (syncedTheme.current) return;
    syncedTheme.current = true;
    if (initial.theme !== theme) setTheme(initial.theme);
  }, [initial.theme, theme, setTheme]);

  const save = async (patch: Partial<SettingsPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    const res = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res?.ok) toast({ message: "Couldn’t save that setting.", tone: "error" });
  };

  const saveName = async () => {
    const v = name.trim();
    if (!v || v === displayName) return;
    const { error } = await getSupabaseBrowser().from("profiles").update({ display_name: v }).eq("id", userId);
    if (error) toast({ message: "Couldn’t update your name.", tone: "error" });
    else {
      toast({ message: "Name updated" });
      router.refresh();
    }
  };

  return (
    <div className="grid gap-12 md:grid-cols-[160px_1fr]">
      <nav className="hidden md:block" aria-label="Settings sections">
        <ul className="sticky top-8 flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <li key={s}>
              <a href={`#${s.toLowerCase()}`} className="block rounded-lg px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
                {s}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-12">
        <Group id="account" title="Account">
          <Row label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="max-w-64" aria-label="Name" />
          </Row>
          <Row label="Email">
            <span className="text-[14px] text-fg-muted">{email}</span>
          </Row>
          <Row label="Session">
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await fetch("/auth/signout", { method: "POST" });
                router.replace("/");
                router.refresh();
              }}
            >
              <LogOut /> Sign out
            </Button>
          </Row>
        </Group>

        <Group id="appearance" title="Appearance">
          <Row label="Theme">
            <Segmented
              label="Theme"
              value={theme}
              onChange={(t) => {
                setTheme(t);
                void save({ theme: t });
              }}
              options={[
                { value: "light", label: "Light", icon: <Sun /> },
                { value: "dark", label: "Dark", icon: <Moon /> },
                { value: "system", label: "System", icon: <Monitor /> },
              ]}
            />
          </Row>
          <Row label="Colors, voice and accessibility" hint="Color themes, text size, reduced motion, voices and connected tools.">
            <Button asChild variant="secondary" size="sm">
              <Link href="/personalize">Open Personalize</Link>
            </Button>
          </Row>
        </Group>

        <Group id="ai" title="AI" description="Plans are generated by an open model running on this device.">
          <Row label="Your mode" hint={persona ? persona.blurb : "Plans aren’t tailored to a mode yet."}>
            <div className="flex items-center gap-3">
              {persona && (
                <span className="inline-flex items-center gap-2 text-[14px] text-fg">
                  <span className="text-[20px] leading-none" aria-hidden>
                    {persona.emoji}
                  </span>
                  {persona.label}
                </span>
              )}
              <Button asChild variant="secondary" size="sm">
                <Link href="/setup">{persona ? "Change" : "Choose a mode"}</Link>
              </Button>
            </div>
          </Row>
          <LocalModelSettings />
          <Row label="Planning style" hint={PLANNING_STYLES.find((s) => s.id === prefs.planningStyle)?.description}>
            <Segmented
              label="Planning style"
              value={prefs.planningStyle}
              onChange={(v) => save({ planningStyle: v })}
              options={PLANNING_STYLES.map((s) => ({ value: s.id, label: s.label }))}
            />
          </Row>
          <Row label="Default duration" hint="Used when a goal doesn’t imply a timeframe.">
            <Select
              value={prefs.defaultDurationWeeks ?? ""}
              onChange={(e) => save({ defaultDurationWeeks: e.target.value ? Number(e.target.value) : null })}
              className="max-w-64"
              aria-label="Default duration"
            >
              <option value="">Let the AI decide</option>
              {[1, 2, 4, 6, 8, 12, 16, 26, 52].map((w) => (
                <option key={w} value={w}>
                  {w} {w === 1 ? "week" : "weeks"}
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Daily availability" hint="A starting point for new plans; each plan can override it.">
            <Select value={prefs.dailyMinutes} onChange={(e) => save({ dailyMinutes: Number(e.target.value) })} className="max-w-64" aria-label="Daily availability">
              {[15, 30, 45, 60, 90, 120, 180, 240, 360, 480].map((m) => (
                <option key={m} value={m}>
                  {formatMinutes(m)} per day
                </option>
              ))}
            </Select>
          </Row>
          <Row label="Days off">
            <div className="flex gap-1" role="group" aria-label="Days off">
              {weekdayNames.short.map((n, d) => {
                const off = prefs.blockedWeekdays.includes(d);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={off}
                    aria-label={`${weekdayNames.long[d]} off`}
                    onClick={() => {
                      const next = off ? prefs.blockedWeekdays.filter((x) => x !== d) : [...prefs.blockedWeekdays, d].sort();
                      if (next.length > 6) return;
                      void save({ blockedWeekdays: next });
                    }}
                    className={cn("size-8 rounded-lg text-xs font-medium transition-colors", off ? "bg-accent-soft text-accent ring-1 ring-inset ring-accent-line" : "bg-surface-2 text-fg-muted hover:text-fg")}
                  >
                    {n[0]}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="Assistant replies">
            <Segmented
              label="Assistant replies"
              value={prefs.responseStyle}
              onChange={(v) => save({ responseStyle: v })}
              options={[
                { value: "concise", label: "Concise" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </Row>
        </Group>

        <Group id="notifications" title="Notifications" description="Saved to your account. Email delivery requires an email provider to be configured for this deployment.">
          <Row label="Weekly summary" hint="A Monday overview of what’s ahead.">
            <Switch checked={prefs.weeklySummary} onCheckedChange={(v) => save({ weeklySummary: v })} label="Weekly summary" />
          </Row>
          <Row label="Task reminders" hint="A nudge on the day a task is due.">
            <Switch checked={prefs.taskReminders} onCheckedChange={(v) => save({ taskReminders: v })} label="Task reminders" />
          </Row>
        </Group>

        <Group id="data" title="Data">
          <Row label="Export" hint="Download every plan as JSON.">
            <Button asChild variant="secondary" size="sm">
              <a href="/api/export" download>
                <Download /> Export plans
              </a>
            </Button>
          </Row>
          <Row label="Delete plans" hint="Permanently remove all of your plans.">
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete all plans
            </Button>
          </Row>
        </Group>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle className="text-[15px] font-semibold">Delete all plans?</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-fg-muted">
            Every plan, task and conversation will be permanently deleted. This can’t be undone.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                const res = await fetch("/api/plans", { method: "DELETE" }).catch(() => null);
                setDeleting(false);
                setConfirmDelete(false);
                toast(res?.ok ? { message: "All plans deleted" } : { message: "Couldn’t delete your plans.", tone: "error" });
                router.refresh();
              }}
            >
              Delete everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Group({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8">
      <h2 id={`${id}-title`} className="text-[15px] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>}
      <div className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[14px] text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
