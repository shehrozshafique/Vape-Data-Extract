"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/supabase/database.types";
import type { ActionResult } from "./competitors";

export async function updateUserPermissions(input: {
  userId: string;
  role: UserRole;
  projectIds: string[];
  can_scan: boolean;
  can_edit_tasks: boolean;
  can_manage_competitors: boolean;
  can_export: boolean;
  can_manage_users: boolean;
}): Promise<ActionResult> {
  try {
    const actor = await requirePermission("can_manage_users");
    // Only super_admins may grant manage_users or change roles to super_admin.
    if (input.can_manage_users || input.role === "super_admin") {
      await requireRole("super_admin");
    }

    const admin = createAdminClient();
    const { error: roleError } = await admin.from("profiles").update({ role: input.role }).eq("id", input.userId);
    if (roleError) return { success: false, error: roleError.message };

    const { error: permError } = await admin.from("user_permissions").upsert({
      user_id: input.userId,
      can_scan: input.can_scan,
      can_edit_tasks: input.can_edit_tasks,
      can_manage_competitors: input.can_manage_competitors,
      can_export: input.can_export,
      can_manage_users: input.can_manage_users,
    });
    if (permError) return { success: false, error: permError.message };

    await admin.from("user_project_access").delete().eq("user_id", input.userId);
    if (input.projectIds.length > 0) {
      const { error: accessError } = await admin.from("user_project_access").insert(
        input.projectIds.map((project_id) => ({ user_id: input.userId, project_id })),
      );
      if (accessError) return { success: false, error: accessError.message };
    }

    const supabase = await createClient();
    await logAudit(supabase, {
      userId: actor.id,
      action: "user.permissions_updated",
      entityType: "profile",
      entityId: input.userId,
      newValue: input as unknown as Record<string, unknown>,
    });

    revalidatePath("/admin");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
