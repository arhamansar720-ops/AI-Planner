import "server-only";
import { PlanSchema, DEFAULT_CONSTRAINTS } from "@/lib/validation/plan";
import type { Plan, PlanSummary } from "@/types/plan";
import type { ServerSupabase } from "./server";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are validated by PlanSchema below */

const PLAN_SELECT = "*, phases(*), tasks(*), milestones(*), resources(*), schedule_items(*)";

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

export async function getPlan(supabase: ServerSupabase, id: string): Promise<Plan | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("plans").select(PLAN_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToPlan(data) : null;
}

export async function savePlan(supabase: ServerSupabase, plan: Plan): Promise<void> {
  const { error } = await supabase.rpc("save_plan", { p_plan: plan });
  if (error) throw error;
}

export async function listPlans(supabase: ServerSupabase): Promise<PlanSummary[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, title, status, created_at, updated_at, start_date, end_date, tasks(status)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startDate: row.start_date,
    endDate: row.end_date,
    taskCount: row.tasks?.length ?? 0,
    doneCount: (row.tasks ?? []).filter((t: any) => t.status === "done").length,
  }));
}

export async function deletePlan(supabase: ServerSupabase, id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

export async function exportPlans(supabase: ServerSupabase): Promise<Plan[]> {
  const { data, error } = await supabase.from("plans").select(PLAN_SELECT).order("created_at");
  if (error) throw error;
  return (data ?? []).map(rowToPlan);
}
