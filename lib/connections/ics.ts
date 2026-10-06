/**
 * Minimal iCalendar (RFC 5545) reading and writing: enough to list upcoming
 * events from a school or calendar feed, and to export a plan as a calendar.
 */

export type FeedEvent = {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  allDay: boolean;
  time: string | null;
  description: string;
};

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}

/** Parse a DTSTART/DUE value into a local date (and time when present). */
function parseDate(value: string, params: string): { date: string; time: string | null; allDay: boolean } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h || /VALUE=DATE(?!-TIME)/i.test(params)) return { date: `${y}-${mo}-${d}`, time: null, allDay: true };
  if (z) {
    // UTC: show it in the server's view of local time is unreliable, so keep the date in UTC
    // but report the clock time in UTC too (feeds for due dates are usually all-day or local).
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    const iso = dt.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) + " UTC", allDay: false };
  }
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}`, allDay: false };
}

export function parseIcs(text: string): FeedEvent[] {
  const events: FeedEvent[] = [];
  let current: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO") {
      current = {};
      continue;
    }
    if ((line === "END:VEVENT" || line === "END:VTODO") && current) {
      const start = current.DTSTART ?? current.DUE;
      const when = start ? parseDate(start.value.trim(), start.params) : null;
      const title = current.SUMMARY ? unescape(current.SUMMARY.value) : "";
      if (when && title) {
        events.push({ title, ...when, description: current.DESCRIPTION ? unescape(current.DESCRIPTION.value).slice(0, 300) : "" });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const [name, ...params] = head.split(";");
    current[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";") };
  }
  return events;
}

/** Events from `from` (inclusive) for `days` days, soonest first, without duplicates. */
export function upcoming(events: FeedEvent[], from: string, days = 70, max = 60): FeedEvent[] {
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  const until = end.toISOString().slice(0, 10);
  const seen = new Set<string>();
  return events
    .filter((e) => e.date >= from && e.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .filter((e) => {
      const key = `${e.date}|${e.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

/** A readable summary for the planner's context window. */
export function describeEvents(source: string, events: FeedEvent[]): string {
  if (!events.length) return `${source}: nothing scheduled in the next few weeks.`;
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return [
    `Upcoming from ${source} (treat these as fixed deadlines and commitments):`,
    ...events.map((e) => `- ${fmt(e.date)}${e.time ? ` ${e.time}` : ""}: ${e.title}`),
  ].join("\n");
}

/* Writing ------------------------------------------------------------------- */

function escape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Fold lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

const compact = (date: string) => date.replace(/-/g, "");
function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export type CalendarItem = { uid: string; title: string; start: string; end: string; description?: string };

/** All-day events (inclusive `end`) as an .ics document. */
export function buildIcs(name: string, items: CalendarItem[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Forma//Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
  ];
  for (const item of items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(item.start)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(item.end))}`,
      `SUMMARY:${escape(item.title)}`,
      ...(item.description ? [`DESCRIPTION:${escape(item.description)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
