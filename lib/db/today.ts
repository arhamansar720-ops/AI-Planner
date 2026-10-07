import "server-only";
import { query } from "./pool";

export type AgendaSession = {
  id: string;
  date: string;
  startMinute: number;
  durationMinutes: number;
  planId: string;
  planTitle: string;
  phaseTitle: string | null;
  taskId: string;
  taskTitle: string;
  taskStatus: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string;
};

export type AgendaTask = {
  planId: string;
  planTitle: string;
  taskId: string;
  taskTitle: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
  estimatedMinutes: number;
};

export type Agenda = {
  date: string;
  sessions: AgendaSession[];
  overdue: AgendaTask[];
  dueToday: AgendaTask[];
  focus: { todayMinutes: number; weekMinutes: number };
  activePlans: number;
};

/**
 * Everything on the person's plate from `date` (their local day) through the
 * next six days, across every active plan, plus overdue work and focus totals.
 * `since` is the start of their local day as an instant, for focus totals.
 */
export async function getAgenda(userId: string, date: string, since: string): Promise<Agenda> {
  const [sessions, open, focus, plans] = await Promise.all([
    query<{
      id: string;
      date: string;
      start_minute: number;
      duration_minutes: number;
      plan_id: string;
      plan_title: string;
      phase_title: string | null;
      task_id: string;
      task_title: string;
      task_status: AgendaSession["taskStatus"];
      priority: AgendaSession["priority"];
      due_date: string;
    }>(
      `select s.id, s.date, s.start_minute, s.duration_minutes, p.id as plan_id, p.title as plan_title,
              ph.title as phase_title, t.id as task_id, t.title as task_title, t.status as task_status,
              t.priority, t.due_date
       from schedule_items s
       join tasks t on t.id = s.task_id
       join plans p on p.id = s.plan_id
       left join phases ph on ph.id = t.phase_id
       where s.user_id = $1 and p.user_id = $1 and p.status = 'active'
         and s.date between $2::date and $2::date + 6
       order by s.date, s.start_minute
       limit 300`,
      [userId, date],
    ),
    query<{
      plan_id: string;
      plan_title: string;
      task_id: string;
      task_title: string;
      priority: AgendaTask["priority"];
      due_date: string;
      estimated_minutes: number;
    }>(
      `select p.id as plan_id, p.title as plan_title, t.id as task_id, t.title as task_title, t.priority,
              t.due_date, t.estimated_minutes
       from tasks t join plans p on p.id = t.plan_id
       where t.user_id = $1 and p.user_id = $1 and p.status = 'active' and t.status <> 'done' and t.due_date <= $2::date
       order by t.due_date, case t.priority when 'high' then 0 when 'medium' then 1 else 2 end
       limit 60`,
      [userId, date],
    ),
    query<{ today: number; week: number }>(
      `select coalesce(sum(minutes) filter (where ended_at >= $2::timestamptz), 0)::int as today,
              coalesce(sum(minutes) filter (where ended_at >= $2::timestamptz - interval '6 days'), 0)::int as week
       from focus_sessions where user_id = $1`,
      [userId, since],
    ),
    query<{ count: number }>(`select count(*)::int as count from plans where user_id = $1 and status = 'active'`, [userId]),
  ]);

  const toTask = (r: (typeof open.rows)[number]): AgendaTask => ({
    planId: r.plan_id,
    planTitle: r.plan_title,
    taskId: r.task_id,
    taskTitle: r.task_title,
    priority: r.priority,
    dueDate: r.due_date,
    estimatedMinutes: r.estimated_minutes,
  });

  return {
    date,
    sessions: sessions.rows.map((r) => ({
      id: r.id,
      date: r.date,
      startMinute: r.start_minute,
      durationMinutes: r.duration_minutes,
      planId: r.plan_id,
      planTitle: r.plan_title,
      phaseTitle: r.phase_title,
      taskId: r.task_id,
      taskTitle: r.task_title,
      taskStatus: r.task_status,
      priority: r.priority,
      dueDate: r.due_date,
    })),
    overdue: open.rows.filter((r) => r.due_date < date).map(toTask),
    dueToday: open.rows.filter((r) => r.due_date === date).map(toTask),
    focus: { todayMinutes: focus.rows[0]?.today ?? 0, weekMinutes: focus.rows[0]?.week ?? 0 },
    activePlans: plans.rows[0]?.count ?? 0,
  };
}

export async function recordFocus(
  userId: string,
  input: { planId: string | null; taskId: string | null; taskTitle: string; minutes: number; startedAt: string },
) {
  // Only link a plan the user owns; otherwise keep the minutes without the link.
  const { rows } = input.planId
    ? await query<{ id: string }>(`select id from plans where id = $1 and user_id = $2`, [input.planId, userId])
    : { rows: [] as { id: string }[] };
  const planId = rows[0]?.id ?? null;
  await query(
    `insert into focus_sessions (user_id, plan_id, task_id, task_title, minutes, started_at) values ($1, $2, $3, $4, $5, $6)`,
    [userId, planId, planId ? input.taskId : null, input.taskTitle.slice(0, 200), input.minutes, input.startedAt],
  );
}
