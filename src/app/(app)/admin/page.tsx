import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUserRules } from "@/components/admin/admin-user-rules";
import { getCurrentProfile, getUserPermissions, hasRole } from "@/lib/auth";
import { getUserAdminRows } from "@/lib/queries/permissions";
import { getProjects } from "@/lib/queries/projects";
import { getCompetitorCount } from "@/lib/queries/competitors";
import { MAX_COMPETITORS } from "@/lib/constants";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const permissions = await getUserPermissions(profile.id);
  const canAccess = hasRole(profile, "manager") || permissions.can_manage_users;
  if (!canAccess) redirect("/");

  const [users, projects, competitorCount] = await Promise.all([
    getUserAdminRows(),
    getProjects(),
    getCompetitorCount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage users, project access, and workflow rules.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Projects</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Competitors</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {competitorCount} / {MAX_COMPETITORS}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Slots across all projects</CardContent>
        </Card>
      </div>

      <AdminUserRules
        users={users}
        projects={projects}
        currentUserId={profile.id}
        canEditRoles={permissions.can_manage_users || hasRole(profile, "super_admin")}
      />
    </div>
  );
}
