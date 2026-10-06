import { buildIcs, type CalendarItem } from "@/lib/connections/ics";
import { getPlan } from "@/lib/db/plans";
import { jsonError, requireUser } from "@/lib/utils/api";

type Context = { params: Promise<{ id: string }> };

/** The plan as an .ics file: tasks span their window, milestones are single days. */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const plan = await getPlan(auth.supabase, id);
  if (!plan) return jsonError(404, "Not found");

  const items: CalendarItem[] = [
    ...plan.tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        uid: `${t.id}@forma`,
        title: t.title,
        start: t.startDate,
        end: t.dueDate < t.startDate ? t.startDate : t.dueDate,
        description: [t.description, t.estimatedMinutes ? `About ${t.estimatedMinutes} minutes of work.` : ""].filter(Boolean).join("\n"),
      })),
    ...plan.milestones.map((m) => ({ uid: `${m.id}@forma`, title: `◆ ${m.title}`, start: m.date, end: m.date, description: m.description })),
  ];
  const filename = `${plan.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "plan"}.ics`;
  return new Response(buildIcs(plan.title, items), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
