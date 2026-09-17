"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/supabase/database.types";
import type { ActionResult } from "./competitors";

export async function createTaskStatus(input: { key: string; label: string; color: string; description?: string }): Promise<ActionResult> {
  try {
    const profile = await requireRole("manager");
    const supabase = await createClient();
    const key = input.key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key || !input.label.trim()) return { success: false, error: "Key and label are required" };

    const { data: maxOrder } = await supabase.from("task_statuses").select("sort_order").order("sort_order", { ascending: false }).limit(1).single();

    const { error } = await supabase.from("task_statuses").insert({
      key,
      label: input.label.trim(),
      color: input.color,
      description: input.description?.trim() || null,
      sort_order: (maxOrder?.sort_order ?? 0) + 10,
    });
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, { userId: profile.id, action: "task_status.created", entityType: "task_status", newValue: input });
    revalidatePath("/settings");
    revalidatePath("/tasks");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function updateTaskStatusDefinition(
  statusId: string,
  input: { label: string; color: string; description?: string; is_terminal: boolean },
): Promise<ActionResult> {
  try {
    const profile = await requireRole("manager");
    const supabase = await createClient();
    const { error } = await supabase
      .from("task_statuses")
      .update({
        label: input.label.trim(),
        color: input.color,
        description: input.description?.trim() || null,
        is_terminal: input.is_terminal,
      })
      .eq("id", statusId);
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, { userId: profile.id, action: "task_status.updated", entityType: "task_status", entityId: statusId, newValue: input });
    revalidatePath("/settings");
    revalidatePath("/tasks");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function setDefaultTaskStatus(statusId: string): Promise<ActionResult> {
  try {
    await requireRole("manager");
    const supabase = await createClient();
    await supabase.from("task_statuses").update({ is_default: false }).neq("id", statusId);
    const { error } = await supabase.from("task_statuses").update({ is_default: true }).eq("id", statusId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

/** Role changes bypass RLS deliberately (via the service-role client) after this explicit
 * super_admin check — see the profiles_guard_role trigger, which blocks this any other way. */
export async function updateUserRole(userId: string, role: UserRole): Promise<ActionResult> {
  try {
    const profile = await requireRole("super_admin");
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { success: false, error: error.message };

    const supabase = await createClient();
    await logAudit(supabase, { userId: profile.id, action: "user.role_changed", entityType: "profile", entityId: userId, newValue: { role } });

    revalidatePath("/settings");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
