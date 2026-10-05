import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { WorkspaceView } from "@/components/planner/plan-store";
import { Workspace } from "@/components/planner/workspace";
import { TopNav } from "@/components/shell/top-nav";
import { getPlan } from "@/lib/db/plans";
import { getSession } from "@/lib/db/server";
import { getNavUser } from "@/lib/db/user";

const VIEWS: WorkspaceView[] = ["overview", "timeline", "tasks", "calendar", "milestones", "resources", "notes"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { supabase, user } = await getSession();
  if (!user) return {};
  const plan = await getPlan(supabase, id).catch(() => null);
  return { title: plan?.title ?? "Plan" };
}

export default async function PlanPage({ params, searchParams }: Props) {
  const [{ id }, { view }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/plan/${id}`);
  const [plan, navUser] = await Promise.all([getPlan(supabase, id), getNavUser(supabase, user)]);
  if (!plan) notFound();

  return (
    <div className="min-h-dvh">
      <TopNav user={navUser} />
      <Workspace
        key={plan.id}
        plan={plan}
        initialView={VIEWS.includes(view as WorkspaceView) ? (view as WorkspaceView) : "overview"}
      />
    </div>
  );
}
