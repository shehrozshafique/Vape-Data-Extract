import { TaskStatusManager } from "@/components/settings/task-status-manager";
import { UserRoleManager } from "@/components/settings/user-role-manager";
import { AuditLogTable } from "@/components/settings/audit-log-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getTaskStatuses } from "@/lib/queries/task-statuses";
import { getProfiles } from "@/lib/queries/profiles";
import { getAuditLog } from "@/lib/queries/audit";
import { getCompetitorCount } from "@/lib/queries/competitors";
import { getCurrentProfile, hasRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MAX_COMPETITORS } from "@/lib/constants";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!hasRole(profile, "team_member")) redirect("/");

  const isManager = hasRole(profile, "manager");
  const isSuperAdmin = hasRole(profile, "super_admin");

  const [statuses, competitorCount] = await Promise.all([getTaskStatuses(), getCompetitorCount()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Workflow configuration, team access, and system activity.</p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>Read-only summary of the current configuration.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Competitor slots</p>
            <p className="text-lg font-semibold">{competitorCount} / {MAX_COMPETITORS}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your role</p>
            <p className="text-lg font-semibold">{profile?.role.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Workflow statuses</p>
            <p className="text-lg font-semibold">{statuses.length}</p>
          </div>
        </CardContent>
      </Card>

      {isManager ? (
        <TaskStatusManager statuses={statuses} />
      ) : (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ask a manager or admin to change task statuses.
          </CardContent>
        </Card>
      )}

      {isSuperAdmin && <UserRoleManagerSection currentUserId={profile!.id} />}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Admin Panel</CardTitle>
          <CardDescription>
            Manage per-user project access and workflow permissions from the Admin Panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isManager ? (
            <a href="/admin" className="text-sm font-medium text-primary hover:underline">
              Open Admin Panel →
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Ask a manager or admin for access rules.</p>
          )}
        </CardContent>
      </Card>

      {isManager && <AuditLogSection />}
    </div>
  );
}

async function UserRoleManagerSection({ currentUserId }: { currentUserId: string }) {
  const profiles = await getProfiles();
  return <UserRoleManager profiles={profiles} currentUserId={currentUserId} />;
}

async function AuditLogSection() {
  const entries = await getAuditLog(50);
  return <AuditLogTable entries={entries} />;
}
