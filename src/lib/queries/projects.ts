import { cookies } from "next/headers";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

export async function getProjects(): Promise<Project[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("projects").select("*").order("name", { ascending: true });
    if (error) {
      console.error("getProjects:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getProjects failed:", err);
    return [];
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  return data ?? null;
}

export async function getProjectCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("projects").select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Resolves the active project from cookie (or first available). Pass `projects` to avoid a second fetch. */
export async function getActiveProject(
  allowedProjectIds?: string[] | null,
  projects?: Project[],
): Promise<Project | null> {
  const list = projects ?? (await getProjects());
  if (list.length === 0) return null;

  const visible =
    allowedProjectIds && allowedProjectIds.length > 0
      ? list.filter((p) => allowedProjectIds.includes(p.id))
      : list;

  if (visible.length === 0) return null;

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  if (cookieId) {
    const match = visible.find((p) => p.id === cookieId);
    if (match) return match;
  }

  return visible[0] ?? null;
}

export async function getCompetitorCountForProject(projectId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  return count ?? 0;
}

/** One query for all project competitor counts — avoids N+1 on the projects page. */
export async function getCompetitorCountsByProject(
  projectIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(projectIds.map((id) => [id, 0]));
  if (projectIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase.from("competitors").select("project_id").in("project_id", projectIds);
  if (error) {
    console.error("getCompetitorCountsByProject:", error.message);
    return counts;
  }
  for (const row of data ?? []) {
    if (!row.project_id) continue;
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
  }
  return counts;
}

/** Sitemap URLs already saved for a project — used to prefill the project form. */
export async function getCompetitorSitemapUrlsByProject(
  projectIds: string[],
): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = Object.fromEntries(projectIds.map((id) => [id, []]));
  if (projectIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitors")
    .select("project_id, sitemap_url")
    .in("project_id", projectIds)
    .order("name", { ascending: true });
  if (error) {
    console.error("getCompetitorSitemapUrlsByProject:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    if (!row.project_id || !row.sitemap_url) continue;
    (map[row.project_id] ??= []).push(row.sitemap_url);
  }
  return map;
}
