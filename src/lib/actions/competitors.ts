"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { competitorFormSchema } from "@/lib/validation/competitor";
import { extractDomain } from "@/lib/crawler/normalize-url";
import { scanCompetitor } from "@/lib/crawler/scan-competitor";
import { DEFAULT_SCAN_FREQUENCY_MINUTES, MAX_COMPETITORS, AUTH_DISABLED } from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createCompetitor(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const { count } = await supabase.from("competitors").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_COMPETITORS) {
      return { success: false, error: `${MAX_COMPETITORS} competitor monitoring slots currently configured.` };
    }

    const parsed = competitorFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid competitor details" };
    }

    const domain = extractDomain(parsed.data.website_url);
    if (!domain) return { success: false, error: "Could not read a domain from that website URL" };

    const { data: inserted, error } = await supabase
      .from("competitors")
      .insert({
        project_id: parsed.data.project_id,
        name: parsed.data.name,
        domain,
        website_url: parsed.data.website_url,
        logo_url: parsed.data.logo_url || null,
        sitemap_url: parsed.data.sitemap_url,
        product_sitemap_url: parsed.data.product_sitemap_url || null,
        sitemap_type: parsed.data.sitemap_type,
        include_patterns: parsed.data.include_patterns,
        exclude_patterns: parsed.data.exclude_patterns,
        status: parsed.data.status,
        scan_frequency_minutes: parsed.data.scan_frequency_minutes || DEFAULT_SCAN_FREQUENCY_MINUTES,
        baseline_import_as_tasks: parsed.data.baseline_import_as_tasks,
        notes: parsed.data.notes || null,
        created_by: AUTH_DISABLED ? null : profile.id,
      })
      .select("id")
      .single();

    if (error || !inserted) return { success: false, error: error?.message ?? "Could not create competitor" };

    await logAudit(supabase, {
      userId: profile.id,
      action: "competitor.created",
      entityType: "competitor",
      entityId: inserted.id,
      newValue: parsed.data,
    });

    revalidatePath("/competitors");
    revalidatePath("/");

    // Kick off the baseline scan immediately so the team isn't waiting on the next cron tick.
    // `after()` keeps the function alive to finish this even though the response above has
    // already been sent — a bare unawaited promise would risk the platform freezing/killing
    // the function right after the response flushes, on Vercel and similar serverless hosts.
    after(() => scanCompetitor(inserted.id, { trigger: "initial", triggeredByUserId: profile.id }).catch(() => {}));

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function updateCompetitor(competitorId: string, formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const parsed = competitorFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid competitor details" };
    }

    const { data: before } = await supabase.from("competitors").select("*").eq("id", competitorId).single();
    const domain = extractDomain(parsed.data.website_url);
    if (!domain) return { success: false, error: "Could not read a domain from that website URL" };

    const { error } = await supabase
      .from("competitors")
      .update({
        project_id: parsed.data.project_id,
        name: parsed.data.name,
        domain,
        website_url: parsed.data.website_url,
        logo_url: parsed.data.logo_url || null,
        sitemap_url: parsed.data.sitemap_url,
        product_sitemap_url: parsed.data.product_sitemap_url || null,
        sitemap_type: parsed.data.sitemap_type,
        include_patterns: parsed.data.include_patterns,
        exclude_patterns: parsed.data.exclude_patterns,
        status: parsed.data.status,
        scan_frequency_minutes: parsed.data.scan_frequency_minutes || DEFAULT_SCAN_FREQUENCY_MINUTES,
        baseline_import_as_tasks: parsed.data.baseline_import_as_tasks,
        notes: parsed.data.notes || null,
      })
      .eq("id", competitorId);

    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "competitor.updated",
      entityType: "competitor",
      entityId: competitorId,
      previousValue: before,
      newValue: parsed.data,
    });

    revalidatePath("/competitors");
    revalidatePath(`/competitors/${competitorId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function deleteCompetitor(competitorId: string): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const { data: before } = await supabase.from("competitors").select("*").eq("id", competitorId).single();
    if (!before) return { success: false, error: "Competitor not found" };

    const { error } = await supabase.from("competitors").delete().eq("id", competitorId);
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "competitor.deleted",
      entityType: "competitor",
      entityId: competitorId,
      previousValue: before,
    });

    revalidatePath("/competitors");
    revalidatePath("/tasks");
    revalidatePath("/");
    revalidatePath("/activity");
    revalidatePath("/projects");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function setCompetitorStatus(competitorId: string, status: "active" | "paused"): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();
    const { error } = await supabase.from("competitors").update({ status }).eq("id", competitorId);
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "competitor.status_changed",
      entityType: "competitor",
      entityId: competitorId,
      newValue: { status },
    });

    revalidatePath("/competitors");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

/**
 * Manual "Scan Now" trigger. Runs the scan inline and waits for it to finish — competitor
 * sitemaps are small enough (10 competitors max) that this stays well under typical serverless
 * function timeouts, and the caller gets an immediate success/failure result instead of having
 * to poll.
 */
export async function triggerManualScan(competitorId: string): Promise<ActionResult & { newProducts?: number }> {
  try {
    const profile = await requirePermission("can_scan");
    const outcome = await scanCompetitor(competitorId, { trigger: "manual", triggeredByUserId: profile.id });

    if (outcome.skipped) {
      return { success: false, error: outcome.skipReason ?? "Scan was skipped" };
    }

    revalidatePath("/competitors");
    revalidatePath(`/competitors/${competitorId}`);
    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/activity");

    return { success: true, newProducts: outcome.newUrls ?? 0 };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export type ProjectScanResult =
  | {
      success: true;
      scanned: number;
      skipped: number;
      newProducts: number;
      details: { name: string; newProducts: number; skipped?: string }[];
    }
  | { success: false; error: string };

/** Scans every active competitor in a project and returns how many new products were found. */
export async function triggerProjectScan(projectId: string): Promise<ProjectScanResult> {
  try {
    const profile = await requirePermission("can_scan");
    const supabase = await createClient();

    const { data: competitors, error } = await supabase
      .from("competitors")
      .select("id, name")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) return { success: false, error: error.message };
    if (!competitors || competitors.length === 0) {
      return { success: false, error: "No active competitors to scan for this project." };
    }

    let scanned = 0;
    let skipped = 0;
    let newProducts = 0;
    const details: { name: string; newProducts: number; skipped?: string }[] = [];

    // Sequential keeps Vercel function time and sitemap hosts happier than a parallel burst.
    for (const competitor of competitors) {
      const outcome = await scanCompetitor(competitor.id, {
        trigger: "manual",
        triggeredByUserId: profile.id,
      });

      if (outcome.skipped) {
        skipped += 1;
        details.push({ name: competitor.name, newProducts: 0, skipped: outcome.skipReason });
        continue;
      }

      scanned += 1;
      const found = outcome.newUrls ?? 0;
      newProducts += found;
      details.push({ name: competitor.name, newProducts: found });
    }

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.scanned",
      entityType: "project",
      entityId: projectId,
      newValue: { scanned, skipped, newProducts },
    });

    revalidatePath("/competitors");
    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath("/activity");
    revalidatePath("/projects");

    return { success: true, scanned, skipped, newProducts, details };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
