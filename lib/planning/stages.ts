/** Application-level planning stages shown while a plan is being built. */
export const STAGES = [
  { id: "understanding", label: "Understanding your goal", status: "Understanding", line: "Reading your goal…" },
  { id: "constraints", label: "Identifying constraints", status: "Understanding", line: "Structuring your goal…" },
  { id: "phases", label: "Breaking the goal into phases", status: "Planning", line: "Building the first phase…" },
  { id: "tasks", label: "Creating actionable tasks", status: "Planning", line: "Turning phases into tasks…" },
  { id: "dependencies", label: "Checking dependencies", status: "Organizing", line: "Finding dependencies…" },
  { id: "timeline", label: "Building the timeline", status: "Optimizing", line: "Balancing the timeline…" },
  { id: "finalizing", label: "Finalizing your plan", status: "Finalizing", line: "Finalizing your next steps…" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export function stageIndex(id: StageId) {
  return STAGES.findIndex((s) => s.id === id);
}
