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

/** Resolves the active project from cookie (or first available). Returns null if none exist. */
export async function getActiveProject(allowedProjectIds?: string[] | null): Promise<Project | null> {
  const projects = await getProjects();
  if (projects.length === 0) return null;

  const visible =
    allowedProjectIds && allowedProjectIds.length > 0
      ? projects.filter((p) => allowedProjectIds.includes(p.id))
      : projects;

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
