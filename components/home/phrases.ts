export const HEADINGS = [
  "What are we planning today?",
  "What are you building?",
  "What are you trying to accomplish?",
  "What should we figure out?",
  "What’s on your mind?",
  "What are we working toward?",
  "What should we plan next?",
  "What are you getting ready for?",
  "What do you want to make happen?",
  "What’s the goal?",
] as const;

/** Pick a heading, never repeating the one shown last. */
export function pickHeading(previous?: number): number {
  if (HEADINGS.length < 2) return 0;
  let next = Math.floor(Math.random() * HEADINGS.length);
  if (next === previous) next = (next + 1 + Math.floor(Math.random() * (HEADINGS.length - 1))) % HEADINGS.length;
  return next;
}

export const SUGGESTIONS = [
  { label: "Study", starter: "Help me create a study plan for " },
  { label: "Fitness", starter: "Plan a fitness routine that helps me " },
  { label: "Travel", starter: "Plan a trip to " },
  { label: "Career", starter: "Help me plan my next career move: " },
  { label: "Projects", starter: "Help me turn this idea into a project plan: " },
  { label: "Finance", starter: "Help me build a plan to save " },
  { label: "Life", starter: "Help me get organized around " },
  { label: "Business", starter: "Help me plan the launch of " },
] as const;
