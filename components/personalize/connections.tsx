"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck2, Check, Unplug } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { FeedEvent } from "@/lib/connections/ics";
import { PROVIDERS, type Provider } from "@/lib/connections/providers";
import { clearSkywardSnapshot, readSkywardSnapshot, saveSkywardSnapshot, SKYWARD_MAX, type SkywardSnapshot } from "@/lib/connections/skyward";
import type { PublicConnection } from "@/lib/connections/store";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils/cn";

const noop = () => () => {};

export function ConnectionsSection({ initial }: { initial: PublicConnection[] }) {
  const toast = useToast();
  const [connections, setConnections] = useState(initial);
  const mountedSkyward = useSyncExternalStore(noop, readSkywardSnapshotStable, () => null);
  const [skyward, setSkyward] = useState<SkywardSnapshot | null | undefined>(undefined);
  const skywardNow = skyward === undefined ? mountedSkyward : skyward;
  const [active, setActive] = useState<Provider | null>(null);
  const [preview, setPreview] = useState<{ provider: string; events: FeedEvent[] } | null>(null);

  const disconnect = async (c: PublicConnection) => {
    const res = await fetch(`/api/connections/${c.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setConnections((list) => list.filter((x) => x.id !== c.id));
    else toast({ message: "Couldn’t disconnect.", tone: "error" });
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((p, i) => {
          const connection = connections.find((c) => c.provider === p.id);
          const connected = p.kind === "paste" ? Boolean(skywardNow) : Boolean(connection);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.04, ease: ease.expo }}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-surface p-4 transition-colors",
                connected ? "border-accent-line" : "border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[17px] font-bold text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]"
                  style={{ background: p.color }}
                  aria-hidden
                >
                  {p.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                    {p.name}
                    {connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        <Check className="size-3" strokeWidth={3} /> Connected
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{p.blurb}</p>
                  {connection && <p className="mt-1 truncate text-[11.5px] text-fg-subtle">via {connection.host}</p>}
                  {p.kind === "paste" && skywardNow && (
                    <p className="mt-1 text-[11.5px] text-fg-subtle">
                      Saved on this device · {new Date(skywardNow.savedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                {connected ? (
                  <>
                    {connection && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          const res = await fetch(`/api/connections/${connection.id}`).catch(() => null);
                          const data = res ? ((await res.json()) as { events?: FeedEvent[]; error?: string }) : {};
                          if (!res?.ok) toast({ message: data.error ?? "Couldn’t read that calendar.", tone: "error" });
                          else setPreview({ provider: p.name, events: data.events ?? [] });
                        }}
                      >
                        <CalendarCheck2 /> Upcoming
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setActive(p)}>
                      {p.kind === "paste" ? "Update" : "Change link"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-fg-subtle"
                      onClick={() => {
                        if (p.kind === "paste") {
                          clearSkywardSnapshot();
                          setSkyward(null);
                        } else if (connection) void disconnect(connection);
                      }}
                    >
                      <Unplug /> Disconnect
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" className="rounded-full px-4" onClick={() => setActive(p)}>
                    Connect
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
        To use them, choose <span className="text-fg-muted">Add context → Connected tools</span> when you describe a goal. Going the
        other way, every plan has <span className="text-fg-muted">Add to calendar</span> for Outlook, Google and Apple Calendar.
      </p>

      <ConnectDialog
        provider={active}
        onClose={() => setActive(null)}
        onConnected={(c, events) => {
          setConnections((list) => [...list.filter((x) => x.provider !== c.provider), c]);
          setPreview({ provider: getName(c.provider), events });
        }}
        onSkyward={(snapshot) => setSkyward(snapshot)}
      />

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="w-[min(520px,calc(100vw-32px))]">
          <DialogTitle className="text-[16px] font-semibold">Upcoming from {preview?.provider}</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-fg-muted">
            The next few weeks, as Forma will see them when you add this to a plan.
          </DialogDescription>
          <ul className="mt-4 flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto scrollbar-thin">
            {preview?.events.length === 0 && <li className="text-[13px] text-fg-subtle">Nothing scheduled in the next few weeks.</li>}
            {preview?.events.map((e, i) => (
              <li key={i} className="flex items-baseline gap-3 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
                <span className="w-24 shrink-0 tabular-nums text-fg-subtle">
                  {new Date(`${e.date}T12:00:00Z`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
                <span className="min-w-0 flex-1 text-fg">{e.title}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

let skywardCache: SkywardSnapshot | null | undefined;
function readSkywardSnapshotStable() {
  if (skywardCache === undefined) skywardCache = readSkywardSnapshot();
  return skywardCache;
}

const getName = (id: string) => PROVIDERS.find((p) => p.id === id)?.name ?? "your calendar";

function ConnectDialog({
  provider,
  onClose,
  onConnected,
  onSkyward,
}: {
  provider: Provider | null;
  onClose: () => void;
  onConnected: (c: PublicConnection, events: FeedEvent[]) => void;
  onSkyward: (s: SkywardSnapshot) => void;
}) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    window.setTimeout(() => {
      setValue("");
      setError(null);
    }, 150);
  };

  const submit = async () => {
    if (!provider || !value.trim()) return;
    setError(null);
    if (provider.kind === "paste") {
      if (value.trim().length < 20) return setError("That looks too short. Copy the whole assignments page.");
      onSkyward(saveSkywardSnapshot(value.trim()));
      toast({ message: "Skyward saved on this device" });
      return close();
    }
    setBusy(true);
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: provider.id, url: value.trim() }),
    }).catch(() => null);
    setBusy(false);
    const data = res ? ((await res.json().catch(() => ({}))) as { connection?: PublicConnection; preview?: FeedEvent[]; error?: string }) : {};
    if (!res?.ok || !data.connection) return setError(data.error ?? "Couldn’t connect. Check the link and try again.");
    toast({ message: `${provider.name} connected` });
    onConnected(data.connection, data.preview ?? []);
    close();
  };

  return (
    <Dialog open={provider !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="w-[min(500px,calc(100vw-32px))]">
        {provider && (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl text-[17px] font-bold text-white" style={{ background: provider.color }} aria-hidden>
                {provider.name[0]}
              </span>
              <div>
                <DialogTitle className="text-[16px] font-semibold">Connect {provider.name}</DialogTitle>
                <DialogDescription className="text-[13px] text-fg-muted">{provider.blurb}</DialogDescription>
              </div>
            </div>
            <ol className="mt-5 flex flex-col gap-2.5">
              {provider.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-snug">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{i + 1}</span>
                  <span className="text-fg-muted">{step}</span>
                </li>
              ))}
            </ol>
            <form
              className="mt-5 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {provider.kind === "paste" ? (
                <Textarea
                  autoFocus
                  rows={6}
                  maxLength={SKYWARD_MAX}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste your Skyward assignments here…"
                  aria-label="Skyward assignments"
                />
              ) : (
                <Input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="https://… or webcal://…"
                  inputMode="url"
                  aria-label={`${provider.name} calendar link`}
                />
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11.5px] leading-snug text-fg-subtle">
                  {provider.kind === "paste" ? "Stays on this device." : "Read-only. Forma never changes your calendar."}
                </p>
                <Button type="submit" variant="primary" loading={busy} disabled={!value.trim()}>
                  {provider.kind === "paste" ? "Save" : "Connect"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
