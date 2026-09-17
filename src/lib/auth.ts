import "server-only";
import { cache } from "react";
import { AUTH_DISABLED } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserPermissions = Database["public"]["Tables"]["user_permissions"]["Row"];
export type WorkflowPermission = keyof Pick<
  UserPermissions,
  "can_scan" | "can_edit_tasks" | "can_manage_competitors" | "can_export" | "can_manage_users"
>;

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  team_member: 1,
  manager: 2,
  super_admin: 3,
};

/** Local-dev stand-in when AUTH_DISABLED is on — full access for browsing/testing the UI. */
const DEV_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Local Dev",
  email: "dev@localhost",
  role: "super_admin",
  avatar_url: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

const FULL_PERMISSIONS: UserPermissions = {
  user_id: DEV_PROFILE.id,
  can_scan: true,
  can_edit_tasks: true,
  can_manage_competitors: true,
  can_export: true,
  can_manage_users: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

/** Cached per-request: the signed-in user's profile row, or null if not authenticated. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (AUTH_DISABLED) return DEV_PROFILE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
});

export function hasRole(profile: Profile | null, minimum: UserRole): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[minimum];
}

/** Throws if the current user doesn't meet the minimum role — use at the top of Server Actions
 * that mutate data, in addition to (not instead of) RLS. */
export async function requireRole(minimum: UserRole): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!hasRole(profile, minimum)) {
    throw new Error("You don't have permission to perform this action.");
  }
  return profile as Profile;
}

export const getUserPermissions = cache(async (userId: string): Promise<UserPermissions> => {
  if (AUTH_DISABLED) return { ...FULL_PERMISSIONS, user_id: userId };

  const supabase = await createClient();
  const { data } = await supabase.from("user_permissions").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;

  // Sensible defaults by role when no explicit row exists yet.
  const profile = await getCurrentProfile();
  const isManager = hasRole(profile, "manager");
  const isSuper = hasRole(profile, "super_admin");
  const isTeam = hasRole(profile, "team_member");

  return {
    user_id: userId,
    can_scan: isManager,
    can_edit_tasks: isTeam,
    can_manage_competitors: isManager,
    can_export: isTeam,
    can_manage_users: isSuper,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
});

export const getAllowedProjectIds = cache(async (userId: string): Promise<string[] | null> => {
  if (AUTH_DISABLED) return null; // null = all projects

  const profile = await getCurrentProfile();
  if (hasRole(profile, "super_admin") || hasRole(profile, "manager")) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("user_project_access").select("project_id").eq("user_id", userId);
  return (data ?? []).map((row) => row.project_id);
});

export async function requirePermission(permission: WorkflowPermission): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("You don't have permission to perform this action.");
  if (profile.role === "super_admin") return profile;

  const perms = await getUserPermissions(profile.id);
  if (!perms[permission]) {
    throw new Error("You don't have permission to perform this action.");
  }
  return profile;
}

export async function canUserAccessProject(userId: string, projectId: string): Promise<boolean> {
  const allowed = await getAllowedProjectIds(userId);
  if (allowed === null) return true;
  return allowed.includes(projectId);
}
