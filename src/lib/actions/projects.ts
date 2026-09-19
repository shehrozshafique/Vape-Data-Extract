"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { projectFormSchema } from "@/lib/validation/project";
import { extractDomain } from "@/lib/crawler/normalize-url";
import { scanCompetitor } from "@/lib/crawler/scan-competitor";
import {
  ACTIVE_PROJECT_COOKIE,
  AUTH_DISABLED,
  DEFAULT_SCAN_FREQUENCY_MINUTES,
  MAX_COMPETITORS,
} from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };

function normalizeSitemapKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    return `${host}${path}${parsed.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "").replace(/^https?:\/\/(www\.)?/, "");
  }
}

function competitorRowsFromSitemapUrls(
  urls: string[],
  projectId: string,
  createdBy: string | null,
) {
  const rows = [];
  for (const sitemapUrl of urls) {
    const domain = extractDomain(sitemapUrl);
    if (!domain) continue;
    const name =
      domain
        .split(".")[0]
        ?.replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) || domain;
    rows.push({
      project_id: projectId,
      name,
      domain,
      website_url: `https://${domain}`,
      sitemap_url: sitemapUrl,
      product_sitemap_url: null,
      sitemap_type: "auto" as const,
      include_patterns: [] as string[],
      exclude_patterns: [] as string[],
      status: "active" as const,
      scan_frequency_minutes: DEFAULT_SCAN_FREQUENCY_MINUTES,
      baseline_import_as_tasks: false,
      notes: null,
      created_by: createdBy,
    });
  }
  return rows;
}

async function syncProjectCompetitors(params: {
  projectId: string;
  sitemapUrls: string[];
  userId: string;
}): Promise<{ added: number; error?: string }> {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("competitors")
    .select("id, sitemap_url")
    .eq("project_id", params.projectId);

  if (existingError) return { added: 0, error: existingError.message };

  const existingKeys = new Set((existing ?? []).map((row) => normalizeSitemapKey(row.sitemap_url)));
  const toAdd = params.sitemapUrls.filter((url) => !existingKeys.has(normalizeSitemapKey(url)));
  if (toAdd.length === 0) return { added: 0 };

  const { count, error: countError } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true });
  if (countError) return { added: 0, error: countError.message };

  const remaining = Math.max(0, MAX_COMPETITORS - (count ?? 0));
  if (remaining <= 0) {
    return {
      added: 0,
      error: `Competitor limit reached (${MAX_COMPETITORS}). Remove an existing competitor or raise MAX_COMPETITORS.`,
    };
  }

  const limited = toAdd.slice(0, remaining);
  const rows = competitorRowsFromSitemapUrls(
    limited,
    params.projectId,
    AUTH_DISABLED ? null : params.userId,
  );
  if (rows.length === 0) {
    return { added: 0, error: "Could not read domains from those sitemap URLs. Use full https:// links." };
  }

  const { data: inserted, error } = await supabase.from("competitors").insert(rows).select("id");
  if (error) return { added: 0, error: error.message };

  const ids = (inserted ?? []).map((row) => row.id);
  if (ids.length > 0) {
    after(async () => {
      for (const id of ids) {
        await scanCompetitor(id, { trigger: "initial", triggeredByUserId: params.userId }).catch(() => {});
      }
    });
  }

  return { added: ids.length };
}

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
        // Fake local-dev profile id is not in profiles — omit FK when auth is bypassed.
        created_by: AUTH_DISABLED ? null : profile.id,
      })
      .select("id")
      .single();

    if (error || !inserted) return { success: false, error: error?.message ?? "Could not create project" };

    const sync = await syncProjectCompetitors({
      projectId: inserted.id,
      sitemapUrls: parsed.data.competitor_sitemap_urls,
      userId: profile.id,
    });
    if (sync.error && sync.added === 0 && parsed.data.competitor_sitemap_urls.length > 0) {
      return {
        success: false,
        error: `Project created, but competitors failed: ${sync.error}`,
      };
    }

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.created",
      entityType: "project",
      entityId: inserted.id,
      newValue: parsed.data,
    });

    revalidatePath("/projects");
    revalidatePath("/competitors");
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

    const sync = await syncProjectCompetitors({
      projectId,
      sitemapUrls: parsed.data.competitor_sitemap_urls,
      userId: profile.id,
    });
    if (sync.error && parsed.data.competitor_sitemap_urls.length > 0 && sync.added === 0) {
      return { success: false, error: `Project saved, but competitors failed: ${sync.error}` };
    }

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.updated",
      entityType: "project",
      entityId: projectId,
      previousValue: before ?? undefined,
      newValue: parsed.data,
    });

    revalidatePath("/projects");
    revalidatePath("/competitors");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const profile = await requirePermission("can_manage_competitors");
    const supabase = await createClient();

    const { data: before } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (!before) return { success: false, error: "Project not found" };

    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) return { success: false, error: error.message };

    await logAudit(supabase, {
      userId: profile.id,
      action: "project.deleted",
      entityType: "project",
      entityId: projectId,
      previousValue: before,
    });

    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value === projectId) {
      cookieStore.delete(ACTIVE_PROJECT_COOKIE);
    }

    revalidatePath("/projects");
    revalidatePath("/competitors");
    revalidatePath("/tasks");
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
