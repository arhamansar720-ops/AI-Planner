/**
 * Tools Forma can read from. Most school and calendar apps can publish a
 * private calendar link (iCal); Forma reads upcoming items from it. Skyward
 * has no public feed, so its page is pasted instead.
 */
export const PROVIDERS = [
  {
    id: "schoology",
    name: "Schoology",
    kind: "feed",
    color: "#1b75bb",
    blurb: "Assignments, quizzes and events from your courses",
    steps: [
      "In Schoology, open Calendar.",
      "Choose “Export” (or the calendar feed option) and copy the iCal link.",
      "Paste the link below.",
    ],
  },
  {
    id: "skyward",
    name: "Skyward",
    kind: "paste",
    color: "#0f7a43",
    blurb: "Assignments and due dates from Family Access",
    steps: [
      "Sign in to Skyward Family Access and open Gradebook or your assignments list.",
      "Select everything on the page (Ctrl+A or ⌘A) and copy it.",
      "Paste it below. It stays on this device.",
    ],
  },
  {
    id: "canvas",
    name: "Canvas",
    kind: "feed",
    color: "#d9382c",
    blurb: "Course assignments and calendar events",
    steps: ["In Canvas, open Calendar.", "At the bottom right, select “Calendar Feed” and copy the link.", "Paste the link below."],
  },
  {
    id: "outlook",
    name: "Outlook",
    kind: "feed",
    color: "#0f6cbd",
    blurb: "Your Outlook or Microsoft 365 calendar",
    steps: [
      "In Outlook on the web, open Settings → Calendar → Shared calendars.",
      "Under “Publish a calendar”, pick a calendar with “Can view all details” and select Publish.",
      "Copy the ICS link and paste it below.",
    ],
  },
  {
    id: "google",
    name: "Google Calendar",
    kind: "feed",
    color: "#1a73e8",
    blurb: "Any Google calendar, including Google Classroom’s",
    steps: [
      "In Google Calendar on the web, open Settings and select the calendar.",
      "Under “Integrate calendar”, copy “Secret address in iCal format”.",
      "Paste the link below.",
    ],
  },
  {
    id: "apple",
    name: "Apple Calendar",
    kind: "feed",
    color: "#e5484d",
    blurb: "An iCloud calendar",
    steps: [
      "On iCloud.com, open Calendar and select the share icon next to a calendar.",
      "Turn on “Public Calendar” and copy the link.",
      "Paste the link below.",
    ],
  },
] as const;

export type Provider = (typeof PROVIDERS)[number];
export type ProviderId = Provider["id"];
export const FEED_PROVIDER_IDS = PROVIDERS.filter((p) => p.kind === "feed").map((p) => p.id) as [ProviderId, ...ProviderId[]];

export function getProvider(id: string) {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

/** A connected calendar feed, stored in the account's user metadata. */
export type StoredConnection = { id: string; provider: ProviderId; url: string; addedAt: string };
