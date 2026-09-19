"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserPermissions } from "@/lib/actions/permissions";
import { ROLE_LABELS, WORKFLOW_PERMISSION_LABELS } from "@/lib/constants";
import type { UserAdminRow } from "@/lib/queries/permissions";
import type { Project } from "@/lib/queries/projects";
import type { UserRole } from "@/lib/supabase/database.types";
import { Loader2 } from "lucide-react";

type PermissionKey = keyof typeof WORKFLOW_PERMISSION_LABELS;

export function AdminUserRules({
  users,
  projects,
  currentUserId,
  canEditRoles,
}: {
  users: UserAdminRow[];
  projects: Project[];
  currentUserId: string;
  canEditRoles: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Users &amp; Rules</CardTitle>
        <CardDescription>
          Set each user&apos;s role, project access, and workflow permissions. Super admins bypass project limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No users yet. Sign-ups appear here once auth is enabled.</p>
        ) : (
          users.map((row) => (
            <UserRuleEditor
              key={row.profile.id}
              row={row}
              projects={projects}
              disabled={!canEditRoles || row.profile.id === currentUserId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function UserRuleEditor({
  row,
  projects,
  disabled,
}: {
  row: UserAdminRow;
  projects: Project[];
  disabled: boolean;
}) {
  const [role, setRole] = useState<UserRole>(row.profile.role);
  const [projectIds, setProjectIds] = useState<string[]>(row.projectIds);
  const [flags, setFlags] = useState({
    can_scan: row.permissions.can_scan,
    can_edit_tasks: row.permissions.can_edit_tasks,
    can_manage_competitors: row.permissions.can_manage_competitors,
    can_export: row.permissions.can_export,
    can_manage_users: row.permissions.can_manage_users,
  });
  const [isPending, startTransition] = useTransition();

  function toggleProject(id: string) {
    setProjectIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function save() {
    startTransition(async () => {
      const result = await updateUserPermissions({
        userId: row.profile.id,
        role,
        projectIds,
        ...flags,
      });
      if (result.success) toast.success(`Updated rules for ${row.profile.name ?? row.profile.email}`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">
            {(row.profile.name ?? row.profile.email).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.profile.name ?? "Unnamed"}</p>
          <p className="truncate text-xs text-muted-foreground">{row.profile.email}</p>
        </div>
        <Select
          value={role}
          items={ROLE_LABELS}
          disabled={disabled || isPending}
          onValueChange={(v) => v && setRole(v as UserRole)}
        >
          <SelectTrigger className="h-8 w-44" aria-label={`Role for ${row.profile.name ?? row.profile.email}`}>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} label={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Project access</p>
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground">No projects to assign.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={projectIds.includes(project.id)}
                  disabled={disabled || isPending}
                  onCheckedChange={() => toggleProject(project.id)}
                />
                {project.name}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">Managers and super admins see all projects regardless.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Workflow permissions</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(WORKFLOW_PERMISSION_LABELS) as PermissionKey[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={flags[key]}
                disabled={disabled || isPending}
                onCheckedChange={(checked) => setFlags((prev) => ({ ...prev, [key]: Boolean(checked) }))}
              />
              <Label className="font-normal">{WORKFLOW_PERMISSION_LABELS[key]}</Label>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" disabled={disabled || isPending} onClick={save}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save rules
        </Button>
      </div>
    </div>
  );
}
