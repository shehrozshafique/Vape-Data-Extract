import { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/auth";

export type UserPermissions = Database["public"]["Tables"]["user_permissions"]["Row"];

export interface UserAdminRow {
  profile: Profile;
  permissions: UserPermissions;
  projectIds: string[];
}

export async function getUserAdminRows(): Promise<UserAdminRow[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: permissions }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").order("email", { ascending: true }),
    supabase.from("user_permissions").select("*"),
    supabase.from("user_project_access").select("user_id, project_id"),
  ]);

  const permByUser = new Map((permissions ?? []).map((p) => [p.user_id, p]));
  const projectsByUser = new Map<string, string[]>();
  for (const row of access ?? []) {
    const list = projectsByUser.get(row.user_id) ?? [];
    list.push(row.project_id);
    projectsByUser.set(row.user_id, list);
  }

  return (profiles ?? []).map((profile) => {
    const isManager = profile.role === "manager" || profile.role === "super_admin";
    const isSuper = profile.role === "super_admin";
    const isTeam = profile.role !== "viewer";
    const defaults: UserPermissions = {
      user_id: profile.id,
      can_scan: isManager,
      can_edit_tasks: isTeam,
      can_manage_competitors: isManager,
      can_export: isTeam,
      can_manage_users: isSuper,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
    return {
      profile: profile as Profile,
      permissions: permByUser.get(profile.id) ?? defaults,
      projectIds: projectsByUser.get(profile.id) ?? [],
    };
  });
}

export function defaultPermissionsForRole(role: UserRole, userId: string): Omit<UserPermissions, "created_at" | "updated_at"> {
  const isManager = role === "manager" || role === "super_admin";
  const isSuper = role === "super_admin";
  const isTeam = role !== "viewer";
  return {
    user_id: userId,
    can_scan: isManager,
    can_edit_tasks: isTeam,
    can_manage_competitors: isManager,
    can_export: isTeam,
    can_manage_users: isSuper,
  };
}
