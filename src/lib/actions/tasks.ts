"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { extractProductFromUrl } from "@/lib/crawler/extract";
import { hasAnySpec } from "@/lib/crawler/spec-extraction";
import type { ActionResult } from "./competitors";

const TRACKED_CHANGE_FIELDS = ["name", "price", "sale_price", "availability", "description"] as const;

export async function updateTaskStatus(taskId: string, newStatusId: string, note?: string): Promise<ActionResult> {
  try {
    const profile = await requireRole("team_member");
    const supabase = await createClient();

    const { data: task } = await supabase.from("tasks").select("status_id").eq("id", taskId).single();
    if (!task) return { success: false, error: "Task not found" };

    const { data: newStatus } = await supabase.from("task_statuses").select("is_terminal").eq("id", newStatusId).single();

    const { error } = await supabase
      .from("tasks")
      .update({
        status_id: newStatusId,
        completed_at: newStatus?.is_terminal ? new Date().toISOString() : null,
      })
      .eq("id", taskId);
    if (error) return { success: false, error: error.message };

    await supabase.from("task_history").insert({
      task_id: taskId,
      old_status_id: task.status_id,
      new_status_id: newStatusId,
      changed_by: profile.id,
      note: note || null,
    });

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function bulkUpdateTaskStatus(taskIds: string[], newStatusId: string): Promise<ActionResult> {
  try {
    const profile = await requireRole("team_member");
    const supabase = await createClient();

    const { data: existingTasks } = await supabase.from("tasks").select("id, status_id").in("id", taskIds);
    const { data: newStatus } = await supabase.from("task_statuses").select("is_terminal").eq("id", newStatusId).single();

    const { error } = await supabase
      .from("tasks")
      .update({ status_id: newStatusId, completed_at: newStatus?.is_terminal ? new Date().toISOString() : null })
      .in("id", taskIds);
    if (error) return { success: false, error: error.message };

    if (existingTasks && existingTasks.length > 0) {
      await supabase.from("task_history").insert(
        existingTasks.map((task) => ({
          task_id: task.id,
          old_status_id: task.status_id,
          new_status_id: newStatusId,
          changed_by: profile.id,
        })),
      );
    }

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function assignTask(taskId: string, userId: string | null): Promise<ActionResult> {
  try {
    await requireRole("team_member");
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").update({ assigned_to: userId }).eq("id", taskId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function bulkAssignTasks(taskIds: string[], userId: string | null): Promise<ActionResult> {
  try {
    await requireRole("team_member");
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").update({ assigned_to: userId }).in("id", taskIds);
    if (error) return { success: false, error: error.message };

    revalidatePath("/tasks");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function updateTaskPriority(taskId: string, priority: "low" | "normal" | "high" | "urgent"): Promise<ActionResult> {
  try {
    await requireRole("team_member");
    const supabase = await createClient();
    const { error } = await supabase.from("tasks").update({ priority }).eq("id", taskId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function addTaskNote(taskId: string, body: string): Promise<ActionResult> {
  try {
    const profile = await requireRole("team_member");
    if (!body.trim()) return { success: false, error: "Note can't be empty" };
    const supabase = await createClient();

    const { error } = await supabase.from("task_notes").insert({ task_id: taskId, author_id: profile.id, body: body.trim() });
    if (error) return { success: false, error: error.message };

    revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

/**
 * Re-fetches a single product's page on demand (the "Re-scan product" action) and records any
 * detected field changes in product_changes. This is intentionally separate from the scheduled
 * crawl, which only ever fetches genuinely new URLs — re-checking known products is opt-in and
 * per-product so it never turns into an expensive full re-crawl.
 */
export async function rescanProduct(productId: string): Promise<ActionResult> {
  try {
    const profile = await requireRole("team_member");
    const supabase = await createClient();
    // products/product_specs/product_changes are crawler-owned tables (RLS only grants users
    // SELECT on them, so manual edits can't fabricate data) — a re-scan is the crawler running
    // on demand, so its writes go through the same service-role client the scheduled crawl uses.
    const admin = createAdminClient();

    const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
    if (!product) return { success: false, error: "Product not found" };

    const { data: competitor } = await supabase
      .from("competitors")
      .select("extractor_config")
      .eq("id", product.competitor_id)
      .single();

    const extraction = await extractProductFromUrl(product.product_url, competitor?.extractor_config ?? {});
    if (!extraction.data) {
      await admin
        .from("products")
        .update({ extraction_status: "failed", extraction_error: extraction.error, last_extracted_at: new Date().toISOString() })
        .eq("id", productId);
      return { success: false, error: extraction.error };
    }

    const changes: { product_id: string; field_name: string; previous_value: string | null; new_value: string | null }[] = [];
    for (const field of TRACKED_CHANGE_FIELDS) {
      const previous = product[field as keyof typeof product];
      const next = extraction.data[field as keyof typeof extraction.data];
      if (String(previous ?? "") !== String(next ?? "")) {
        changes.push({ product_id: productId, field_name: field, previous_value: previous == null ? null : String(previous), new_value: next == null ? null : String(next) });
      }
    }
    if (changes.length > 0) {
      await admin.from("product_changes").insert(changes);
    }

    await admin
      .from("products")
      .update({
        name: extraction.data.name,
        brand: extraction.data.brand,
        image_url: extraction.data.image_url,
        price: extraction.data.price,
        sale_price: extraction.data.sale_price,
        availability: extraction.data.availability,
        sku: extraction.data.sku,
        description: extraction.data.description,
        meta_title: extraction.data.meta_title,
        meta_description: extraction.data.meta_description,
        content_hash: extraction.data.contentHash,
        extraction_status: "success",
        extraction_error: null,
        last_extracted_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (hasAnySpec(extraction.data.specs)) {
      await admin.from("product_specs").upsert({ product_id: productId, ...extraction.data.specs }, { onConflict: "product_id" });
    }

    await logAudit(supabase, {
      userId: profile.id,
      action: "product.rescanned",
      entityType: "product",
      entityId: productId,
      newValue: { changes: changes.length },
    });

    revalidatePath("/tasks");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
