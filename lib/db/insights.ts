import "server-only";
import { query } from "./pool";

export type PlanProgress = { id: string; title: string; endDate: string; total: number; done: number };

export type Insights = {
  today: string;
  /** Focused minutes per local day, last 12 months (days with none are omitted). */
  focusByDay: { date: string; value: number }[];
  /** Tasks finished per local day, last 12 months. */
  doneByDay: { date: string; value: number }[];
  /** Of the tasks finished in the last 30 days, how many were on or before their due date. */
  onTime: { done: number; onTime: number };
  /** Scheduled minutes per day for the next 14 days. */
  load: { date: string; value: number }[];
  plans: PlanProgress[];
};

const toRows = (rows: { d: string; v: number }[]) => rows.map((r) => ({ date: r.d, value: Number(r.v) }));

/** `tz` is the person's IANA time zone, so days are their days, not the server's. */
export async function getInsights(userId: string, today: string, tz: string): Promise<Insights> {
  const [focus, done, onTime, load, plans] = await Promise.all([
    query<{ d: string; v: number }>(
      `select ((ended_at at time zone $2)::date)::text as d, sum(minutes)::int as v
       from focus_sessions where user_id = $1 and ended_at > now() - interval '380 days'
       group by 1`,
      [userId, tz],
    ),
    query<{ d: string; v: number }>(
      `select ((completed_at at time zone $2)::date)::text as d, count(*)::int as v
       from tasks where user_id = $1 and completed_at > now() - interval '380 days'
       group by 1`,
      [userId, tz],
    ),
    query<{ done: number; on_time: number }>(
      `select count(*)::int as done,
              count(*) filter (where (completed_at at time zone $2)::date <= due_date)::int as on_time
       from tasks where user_id = $1 and completed_at > now() - interval '30 days'`,
      [userId, tz],
    ),
    query<{ d: string; v: number }>(
      `select s.date::text as d, sum(s.duration_minutes)::int as v
       from schedule_items s join plans p on p.id = s.plan_id join tasks t on t.id = s.task_id
       where s.user_id = $1 and p.status = 'active' and t.status <> 'done'
         and s.date between $2::date and $2::date + 13
       group by 1`,
      [userId, today],
    ),
    query<{ id: string; title: string; end_date: string; total: number; done: number }>(
      `select p.id, p.title, p.end_date::text as end_date, count(t.id)::int as total,
              count(t.id) filter (where t.status = 'done')::int as done
       from plans p left join tasks t on t.plan_id = p.id
       where p.user_id = $1 and p.status = 'active'
       group by p.id order by p.end_date limit 8`,
      [userId],
    ),
  ]);
  return {
    today,
    focusByDay: toRows(focus.rows),
    doneByDay: toRows(done.rows),
    onTime: { done: onTime.rows[0]?.done ?? 0, onTime: onTime.rows[0]?.on_time ?? 0 },
    load: toRows(load.rows),
    plans: plans.rows.map((r) => ({ id: r.id, title: r.title, endDate: r.end_date, total: r.total, done: r.done })),
  };
}
