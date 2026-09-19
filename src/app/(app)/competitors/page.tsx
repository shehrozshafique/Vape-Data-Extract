import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { CompetitorFormDialog } from "@/components/competitors/competitor-form-dialog";
import { ScanNowButton } from "@/components/competitors/scan-now-button";
import { CompetitorStatusToggle } from "@/components/competitors/status-toggle";
import { CompetitorDeleteButton } from "@/components/competitors/competitor-delete-button";
import { getCompetitors } from "@/lib/queries/competitors";
import { getCompetitorActivityTable } from "@/lib/queries/dashboard";
import { getActiveProject, getProjects } from "@/lib/queries/projects";
import { getCurrentProfile, getAllowedProjectIds, getUserPermissions, hasRole } from "@/lib/auth";
import { MAX_COMPETITORS, SCAN_FREQUENCY_OPTIONS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils/dates";

export default async function CompetitorsPage() {
  const profile = await getCurrentProfile();
  const allowedIds = profile ? await getAllowedProjectIds(profile.id) : null;
  const permissions = profile ? await getUserPermissions(profile.id) : null;
  const projects = await getProjects();
  const activeProject = await getActiveProject(allowedIds, projects);
  const projectId = activeProject?.id ?? null;

  const [competitors, activity] = await Promise.all([
    getCompetitors(projectId),
    getCompetitorActivityTable(projectId),
  ]);
  const canManage = Boolean(permissions?.can_manage_competitors || hasRole(profile, "manager"));
  const activityById = new Map(activity.map((row) => [row.id, row]));
  const atLimit = competitors.length >= MAX_COMPETITORS;

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <p className="text-sm text-muted-foreground">Select or create a client project first.</p>
        </div>
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-start gap-3 py-12">
            <p className="text-sm text-muted-foreground">No active project.</p>
            <Button nativeButton={false} render={<Link href="/projects">Go to All Projects</Link>} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <p className="text-sm text-muted-foreground">
            Monitoring for {activeProject.name}. {competitors.length} of {MAX_COMPETITORS} competitor slots in use.
          </p>
        </div>
        {canManage &&
          (atLimit ? (
            <Badge variant="outline" className="px-3 py-1.5 text-xs">
              {MAX_COMPETITORS} competitor monitoring slots currently configured.
            </Badge>
          ) : (
            <CompetitorFormDialog mode="create" projects={projects} defaultProjectId={activeProject.id} />
          ))}
      </div>

      {competitors.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No competitors for this project yet. {canManage ? "Add your first one to start monitoring." : "Ask a manager to add one."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {competitors.map((competitor) => {
            const stats = activityById.get(competitor.id);
            const frequencyLabel =
              SCAN_FREQUENCY_OPTIONS.find((o) => o.minutes === competitor.scan_frequency_minutes)?.label ?? "Once daily";
            return (
              <Card key={competitor.id} className="shadow-none">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/competitors/${competitor.id}`} className="flex min-w-0 items-center gap-3">
                      <ProductImage src={competitor.logo_url} alt={competitor.name} size={40} />
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight hover:underline">{competitor.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{competitor.domain}</p>
                      </div>
                    </Link>
                    {canManage && <CompetitorStatusToggle competitorId={competitor.id} active={competitor.status === "active"} />}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/50 py-2">
                      <p className="text-lg font-semibold tabular-nums">{stats?.today ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground">Today</p>
                    </div>
                    <div className="rounded-md bg-muted/50 py-2">
                      <p className="text-lg font-semibold tabular-nums">{stats?.last7Days ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground">7 Days</p>
                    </div>
                    <div className="rounded-md bg-muted/50 py-2">
                      <p className="text-lg font-semibold tabular-nums">{stats?.totalProducts ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground">Total</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{frequencyLabel}</span>
                    <span>Last scan {relativeTime(competitor.last_scan_at)}</span>
                  </div>

                  {!competitor.baseline_completed_at && (
                    <Badge variant="outline" className="w-fit text-[10px] font-normal">
                      Baseline scan in progress
                    </Badge>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ScanNowButton competitorId={competitor.id} />
                    {canManage && (
                      <>
                        <CompetitorFormDialog
                          mode="edit"
                          competitor={competitor}
                          projects={projects}
                          defaultProjectId={competitor.project_id}
                        />
                        <CompetitorDeleteButton competitorId={competitor.id} competitorName={competitor.name} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
