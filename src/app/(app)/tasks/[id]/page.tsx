import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTaskDetail } from "@/lib/queries/tasks";
import { getTaskStatuses } from "@/lib/queries/task-statuses";
import { getProfiles } from "@/lib/queries/profiles";
import { getCurrentProfile, hasRole } from "@/lib/auth";
import { TaskProductCard } from "@/components/tasks/task-product-card";
import { TaskSpecsCard } from "@/components/tasks/task-specs-card";
import { TaskWorkflowCard } from "@/components/tasks/task-workflow-card";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, statuses, profiles, currentProfile] = await Promise.all([
    getTaskDetail(id),
    getTaskStatuses(),
    getProfiles(),
    getCurrentProfile(),
  ]);

  if (!task) notFound();

  const canEdit = hasRole(currentProfile, "team_member");

  return (
    <div className="space-y-4">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Tasks
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TaskProductCard task={task} />
          <TaskSpecsCard specs={task.specs} />
        </div>
        <TaskWorkflowCard task={task} statuses={statuses} profiles={profiles} canEdit={canEdit} />
      </div>
    </div>
  );
}
