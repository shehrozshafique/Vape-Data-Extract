import { TaskFilters } from "@/components/tasks/task-filters";
import { TasksTable } from "@/components/tasks/tasks-table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { getTasks, getDistinctBrands, type TaskSort } from "@/lib/queries/tasks";
import { getTaskStatuses } from "@/lib/queries/task-statuses";
import { getCompetitors } from "@/lib/queries/competitors";
import { getProfiles } from "@/lib/queries/profiles";
import { getActiveProject } from "@/lib/queries/projects";
import { getCurrentProfile, getAllowedProjectIds, getUserPermissions, hasRole } from "@/lib/auth";
import { getDateRangeForPreset, type DatePreset } from "@/lib/utils/dates";

const PAGE_SIZE = 25;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const allowedIds = profile ? await getAllowedProjectIds(profile.id) : null;
  const permissions = profile ? await getUserPermissions(profile.id) : null;
  const activeProject = await getActiveProject(allowedIds);
  const projectId = activeProject?.id ?? null;

  const dateRange = sp.datePreset && sp.datePreset !== "all" ? getDateRangeForPreset(sp.datePreset as DatePreset) : undefined;

  const competitors = await getCompetitors(projectId);
  const competitorIds = competitors.map((c) => c.id);
  const selectedCompetitor =
    sp.competitor && competitorIds.includes(sp.competitor) ? sp.competitor : undefined;

  const [{ rows, total, page, pageSize }, statuses, brands, profiles] = await Promise.all([
    getTasks({
      competitorId: selectedCompetitor,
      competitorIds: selectedCompetitor ? undefined : competitorIds,
      statusId: sp.status,
      brand: sp.brand,
      assignedTo: sp.assignedTo,
      from: dateRange?.from,
      to: dateRange?.to,
      search: sp.search,
      sort: sp.sort as TaskSort | undefined,
      page: sp.page ? Number(sp.page) : 1,
      pageSize: PAGE_SIZE,
    }),
    getTaskStatuses(),
    getDistinctBrands(),
    getProfiles(),
  ]);

  const canEdit = Boolean(permissions?.can_edit_tasks || hasRole(profile, "team_member"));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Products / Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {activeProject ? (
            <>
              Project <span className="font-medium text-foreground">{activeProject.name}</span> — discovered products ready for
              review.
            </>
          ) : (
            "Every discovered competitor product, ready for your team to review."
          )}
        </p>
      </div>

      <TaskFilters competitors={competitors} statuses={statuses} brands={brands} profiles={profiles} />

      <TasksTable rows={rows} statuses={statuses} profiles={profiles} canEdit={canEdit} />

      <PaginationBar page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
