import "server-only";
import { PlanSchema, DEFAULT_CONSTRAINTS } from "@/lib/validation/plan";
import type { Plan, PlanSummary } from "@/types/plan";
import { query } from "./pool";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are validated by PlanSchema below */

/** A plan row with its children as JSON arrays. */
const PLAN_SELECT = `
  select p.*,
    coalesce((select json_agg(x) from phases x where x.plan_id = p.id), '[]') as phases,
    coalesce((select json_agg(x) from tasks x where x.plan_id = p.id), '[]') as tasks,
    coalesce((select json_agg(x) from milestones x where x.plan_id = p.id), '[]') as milestones,
    coalesce((select json_agg(x) from resources x where x.plan_id = p.id), '[]') as resources,
    coalesce((select json_agg(x) from schedule_items x where x.plan_id = p.id), '[]') as schedule_items
  from plans p`;

function rowToPlan(row: any): Plan {
  const plan = {
    id: row.id,
    title: row.title,
    description: row.description,
    objective: row.objective,
    prompt: row.prompt,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    endDate: row.end_date,
    assumptions: row.assumptions ?? [],
    priorities: row.priorities ?? [],
    nextActions: row.next_actions ?? [],
    risks: row.risks ?? [],
    constraints: { ...DEFAULT_CONSTRAINTS, ...(row.constraints ?? {}) },
    notes: row.notes ?? "",
    model: row.model ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    phases: (row.phases ?? [])
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        summary: p.summary,
        startDate: p.start_date,
        endDate: p.end_date,
        order: p.position,
      }))
      .sort((a: any, b: any) => a.order - b.order),
    tasks: (row.tasks ?? [])
      .map((t: any) => ({
        id: t.id,
        phaseId: t.phase_id,
        title: t.title,
        description: t.description,
        notes: t.notes,
        status: t.status,
        priority: t.priority,
        startDate: t.start_date,
        dueDate: t.due_date,
        estimatedMinutes: t.estimated_minutes,
        dependsOn: t.depends_on ?? [],
        subtasks: t.subtasks ?? [],
        order: t.position,
      }))
      .sort((a: any, b: any) => a.order - b.order),
    milestones: (row.milestones ?? [])
      .map((m: any) => ({
        id: m.id,
        phaseId: m.phase_id,
        title: m.title,
        description: m.description,
        date: m.date,
        reached: m.reached,
        order: m.position,
      }))
      .sort((a: any, b: any) => a.order - b.order),
    resources: (row.resources ?? [])
      .map((r: any) => ({ id: r.id, title: r.title, kind: r.kind, url: r.url, note: r.note, order: r.position }))
      .sort((a: any, b: any) => a.order - b.order),
    schedule: (row.schedule_items ?? [])
      .map((s: any) => ({
        id: s.id,
        taskId: s.task_id,
        date: s.date,
        startMinute: s.start_minute,
        durationMinutes: s.duration_minutes,
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute),
  };
  return PlanSchema.parse(plan);
}

export async function getPlan(userId: string, id: string): Promise<Plan | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await query(`${PLAN_SELECT} where p.id = $1 and p.user_id = $2`, [id, userId]);
  return rows[0] ? rowToPlan(rows[0]) : null;
}

/** Write the whole plan atomically (see save_plan in db/migrations). */
export async function savePlan(userId: string, plan: Plan): Promise<void> {
  await query(`select save_plan($1, $2::jsonb)`, [userId, JSON.stringify(plan)]);
}

export async function listPlans(userId: string): Promise<PlanSummary[]> {
  const { rows } = await query(
    `select p.id, p.title, p.status, p.created_at, p.updated_at, p.start_date, p.end_date,
       (select count(*) from tasks t where t.plan_id = p.id)::int as task_count,
       (select count(*) from tasks t where t.plan_id = p.id and t.status = 'done')::int as done_count
     from plans p where p.user_id = $1 order by p.updated_at desc limit 200`,
    [userId],
  );
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startDate: row.start_date,
    endDate: row.end_date,
    taskCount: row.task_count,
    doneCount: row.done_count,
  }));
}

export async function deletePlan(userId: string, id: string): Promise<void> {
  await query(`delete from plans where id = $1 and user_id = $2`, [id, userId]);
}

export async function deleteAllPlans(userId: string): Promise<void> {
  await query(`delete from plans where user_id = $1`, [userId]);
}

export async function exportPlans(userId: string): Promise<Plan[]> {
  const { rows } = await query(`${PLAN_SELECT} where p.user_id = $1 order by p.created_at`, [userId]);
  return rows.map(rowToPlan);
}
