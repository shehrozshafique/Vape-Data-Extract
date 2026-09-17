import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/product-image";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { getProjects, getCompetitorCountForProject } from "@/lib/queries/projects";
import { getCurrentProfile, getUserPermissions, hasRole } from "@/lib/auth";
import { relativeTime } from "@/lib/utils/dates";

export default async function ProjectsPage() {
  const profile = await getCurrentProfile();
  const permissions = profile ? await getUserPermissions(profile.id) : null;
  const canManage = Boolean(permissions?.can_manage_competitors || hasRole(profile, "manager"));
  const projects = await getProjects();

  const counts = await Promise.all(projects.map((p) => getCompetitorCountForProject(p.id)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">All Projects</h1>
          <p className="text-sm text-muted-foreground">Client websites you monitor competitors for.</p>
        </div>
        {canManage && <ProjectFormDialog mode="create" />}
      </div>

      {projects.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No projects yet. {canManage ? "Add your first client website to get started." : "Ask an admin to add a project."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <Card key={project.id} className="shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductImage src={project.logo_url} alt={project.name} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">{project.name}</p>
                      <a
                        href={project.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-primary hover:underline"
                      >
                        {project.domain}
                      </a>
                    </div>
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "outline"} className="shrink-0 capitalize">
                    {project.status}
                  </Badge>
                </div>

                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-semibold tabular-nums">{counts[index]}</span>
                  <span className="text-muted-foreground"> competitor{counts[index] === 1 ? "" : "s"}</span>
                </div>

                {project.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{project.notes}</p>}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">Updated {relativeTime(project.updated_at)}</span>
                  <div className="flex items-center gap-2">
                    <Link href={`/competitors`} className="text-xs font-medium text-primary hover:underline">
                      Competitors
                    </Link>
                    {canManage && <ProjectFormDialog mode="edit" project={project} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
