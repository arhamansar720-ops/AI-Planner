import { generatePlan, PlannerError, type PlannerEvent } from "@/lib/ai/planner";
import { savePlan } from "@/lib/db/plans";
import { getPreferences } from "@/lib/db/preferences";
import { jsonError, readJson, requireUser } from "@/lib/utils/api";
import { pickModel } from "@/lib/ai/client";
import { GenerateRequestSchema } from "@/lib/validation/api";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Plans a single account may generate per rolling hour. */
const HOURLY_LIMIT = 20;

/**
 * Streams plan generation as Server-Sent Events. Each structured piece of the
 * plan is forwarded the moment it is parsed from the model's output; the
 * final `done` event carries the saved plan.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await readJson(request, GenerateRequestSchema);
  if ("error" in body) return body.error;

  const { supabase, user } = auth;
  const input = body.data;

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("plans")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return jsonError(429, "You’ve made a lot of plans in the last hour. Try again a little later.");
  }
  const preferences = await getPreferences(supabase, user.id);
  const model = pickModel(input.model ?? preferences.model);
  const planId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      // Keep intermediaries from closing an idle connection while the model thinks.
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15_000);

      try {
        const events = generatePlan(
          {
            planId,
            prompt: input.prompt,
            today: input.today,
            model,
            preferences: {
              planningStyle: preferences.planningStyle,
              defaultDurationWeeks: preferences.defaultDurationWeeks,
              dailyMinutes: preferences.dailyMinutes,
              blockedWeekdays: preferences.blockedWeekdays,
              responseStyle: preferences.responseStyle,
            },
            context: input.context,
            clarification: input.clarification ?? null,
          },
          request.signal,
        );

        for await (const event of events as AsyncGenerator<PlannerEvent>) {
          if (event.type === "plan") {
            await savePlan(supabase, event.plan);
            send("done", { plan: event.plan });
          } else {
            const { type, ...data } = event;
            send(type, data);
          }
        }
      } catch (error) {
        if (!request.signal.aborted) {
          const reason = error instanceof PlannerError ? error.reason : "unknown";
          console.error("[generate] plan generation failed", { userId: user.id, reason, error });
          send("error", {
            message: "Something went wrong while building your plan.",
            reason: reason === "refusal" ? "refusal" : "failed",
          });
        }
      } finally {
        clearInterval(heartbeat);
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by a client disconnect
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
