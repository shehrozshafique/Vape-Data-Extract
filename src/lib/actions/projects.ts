"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { projectFormSchema } from "@/lib/validation/project";
import { extractDomain } from "@/lib/crawler/normalize-url";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createProject(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const parsed = projectFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid project details" };
    }

    const domain = extractDomain(parsed.data.website_url);
    if (!domain) return { success: false, error: "Could not read a domain from that website URL" };

    const { data: inserted, error } = await supabase
      .from("projects")
      .insert({
        name: parsed.data.name,
        website_url: parsed.data.website_url,
        domain,
        logo_url: parsed.data.logo_url || null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !inserted) return { success: false, error: error?.message ?? "Could not create project" };

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.created",
      entityType: "project",
      entityId: inserted.id,
      newValue: parsed.data,
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function updateProject(projectId: string, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const parsed = projectFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid project details" };
    }

    const { data: before } = await supabase.from("projects").select("*").eq("id", projectId).single();
    const domain = extractDomain(parsed.data.website_url);
    if (!domain) return { success: false, error: "Could not read a domain from that website URL" };

    const { error } = await supabase
      .from("projects")
      .update({
        name: parsed.data.name,
        website_url: parsed.data.website_url,
        domain,
        logo_url: parsed.data.logo_url || null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      })
      .eq("id", projectId);

    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.updated",
      entityType: "project",
      entityId: projectId,
      previousValue: before ?? undefined,
      newValue: parsed.data,
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const profile = await requireRole("super_admin");
    const supabase = await createClient();

    const { data: before } = await supabase.from("projects").select("*").eq("id", projectId).single();
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.deleted",
      entityType: "project",
      entityId: projectId,
      previousValue: before ?? undefined,
    });

    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value === projectId) {
      cookieStore.delete(ACTIVE_PROJECT_COOKIE);
    }

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function setActiveProject(projectId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
