import type { PlanningStyle } from "./config";

/**
 * Who someone is planning as. Chosen during setup; it shapes the planner's
 * guidance, the starting suggestions on the home screen and the defaults the
 * setup flow proposes. Stored in the account's user metadata.
 */
export const PERSONAS = [
  {
    id: "student",
    emoji: "📚",
    label: "Student",
    blurb: "Classes, exams and applications",
    guidance:
      "The person is a student. Fit work around classes, deadlines and exam dates. Prefer proven study methods (spaced repetition, practice tests, active recall) and focused 25–50 minute sessions, with review time before every exam.",
    defaults: { dailyMinutes: 90, planningStyle: "balanced", blockedWeekdays: [] },
    suggestions: [
      { label: "Exam prep", starter: "Help me prepare for my exam on " },
      { label: "Essay", starter: "Help me plan and write my essay on " },
      { label: "Applications", starter: "Help me apply to " },
      { label: "Semester", starter: "Organize my semester: " },
      { label: "New skill", starter: "Help me learn " },
    ],
  },
  {
    id: "professional",
    emoji: "💼",
    label: "Professional",
    blurb: "Projects, promotions and deadlines",
    guidance:
      "The person is a working professional. Plan around a full-time job: realistic weekday capacity, protected focus blocks, stakeholder check-ins and review cycles, and no work on weekends unless they say otherwise.",
    defaults: { dailyMinutes: 60, planningStyle: "balanced", blockedWeekdays: [0, 6] },
    suggestions: [
      { label: "Project", starter: "Help me deliver this project: " },
      { label: "Promotion", starter: "Help me build a case for a promotion to " },
      { label: "Job search", starter: "Help me find a new role as " },
      { label: "Certification", starter: "Help me get certified in " },
      { label: "Presentation", starter: "Help me prepare a presentation on " },
    ],
  },
  {
    id: "founder",
    emoji: "🚀",
    label: "Founder",
    blurb: "Launches, products and growth",
    guidance:
      "The person is a founder or builds their own business. Bias toward shipping early and learning from real users: validate before building, define a minimal launch, and plan explicit moments for customer feedback and metrics.",
    defaults: { dailyMinutes: 180, planningStyle: "ambitious", blockedWeekdays: [] },
    suggestions: [
      { label: "Launch", starter: "Help me plan the launch of " },
      { label: "MVP", starter: "Help me build an MVP for " },
      { label: "Fundraising", starter: "Help me prepare to raise " },
      { label: "First customers", starter: "Help me find my first customers for " },
      { label: "Hiring", starter: "Help me hire " },
    ],
  },
  {
    id: "creator",
    emoji: "🎨",
    label: "Creator",
    blurb: "Videos, writing, art and music",
    guidance:
      "The person is a creator. Protect blocks for deep creative work, separate making from editing and publishing, and build a sustainable publishing rhythm rather than bursts.",
    defaults: { dailyMinutes: 90, planningStyle: "balanced", blockedWeekdays: [] },
    suggestions: [
      { label: "Channel", starter: "Help me grow my channel about " },
      { label: "Book", starter: "Help me write a book about " },
      { label: "Album", starter: "Help me finish my album: " },
      { label: "Portfolio", starter: "Help me build a portfolio of " },
      { label: "Newsletter", starter: "Help me start a newsletter about " },
    ],
  },
  {
    id: "athlete",
    emoji: "🏃",
    label: "Athlete",
    blurb: "Training, races and healthy habits",
    guidance:
      "The person is training for fitness or sport. Use progressive overload with deload weeks, schedule rest and recovery days, never increase load sharply week over week, and taper before events.",
    defaults: { dailyMinutes: 60, planningStyle: "balanced", blockedWeekdays: [] },
    suggestions: [
      { label: "Race", starter: "Train me for a " },
      { label: "Strength", starter: "Help me get stronger at " },
      { label: "Habit", starter: "Help me build a habit of " },
      { label: "Weight", starter: "Help me reach a healthy weight by " },
      { label: "Season", starter: "Plan my season for " },
    ],
  },
  {
    id: "home",
    emoji: "🏡",
    label: "Life & home",
    blurb: "Family, moves, money and events",
    guidance:
      "The person is organizing personal life and home. Keep daily effort light and fit it around family and other commitments, group errands together, and put budget and booking deadlines early.",
    defaults: { dailyMinutes: 30, planningStyle: "gentle", blockedWeekdays: [] },
    suggestions: [
      { label: "Move", starter: "Help me plan my move to " },
      { label: "Event", starter: "Help me plan " },
      { label: "Savings", starter: "Help me save for " },
      { label: "Renovation", starter: "Help me plan renovating " },
      { label: "Trip", starter: "Plan a trip to " },
    ],
  },
] as const satisfies readonly {
  id: string;
  emoji: string;
  label: string;
  blurb: string;
  guidance: string;
  defaults: { dailyMinutes: number; planningStyle: PlanningStyle; blockedWeekdays: number[] };
  suggestions: readonly { label: string; starter: string }[];
}[];

export type Persona = (typeof PERSONAS)[number];
export type PersonaId = Persona["id"];

export const PERSONA_IDS = PERSONAS.map((p) => p.id) as [PersonaId, ...PersonaId[]];

export function getPersona(id: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
