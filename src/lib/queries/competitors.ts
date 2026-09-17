import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Competitor = Database["public"]["Tables"]["competitors"]["Row"];
export type SitemapScan = Database["public"]["Tables"]["sitemap_scans"]["Row"];

export async function getCompetitors(projectId?: string | null): Promise<Competitor[]> {
  const supabase = await createClient();
  let query = supabase.from("competitors").select("*").order("name", { ascending: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;
  return data ?? [];
}

export async function getCompetitorCount(projectId?: string | null): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("competitors").select("id", { count: "exact", head: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { count } = await query;
  return count ?? 0;
}

export async function getCompetitorById(id: string): Promise<Competitor | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("competitors").select("*").eq("id", id).single();
  return data ?? null;
}

export async function getCompetitorTotalProducts(competitorId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("competitor_id", competitorId);
  return count ?? 0;
}

export async function getScanHistory(competitorId: string, limit = 30): Promise<SitemapScan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sitemap_scans")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getAllScanHistory(
  limit = 100,
  projectId?: string | null,
): Promise<(SitemapScan & { competitor: { id: string; name: string } | null })[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sitemap_scans")
    .select("*, competitors(id, name, project_id)")
    .order("started_at", { ascending: false })
    .limit(limit);

  const { data } = await query;
  const rows = (data ?? []).map((row) => {
    const { competitors, ...rest } = row as unknown as SitemapScan & {
      competitors: { id: string; name: string; project_id: string } | null;
    };
    return { ...rest, competitor: competitors ? { id: competitors.id, name: competitors.name } : null, projectId: competitors?.project_id };
  });

  if (!projectId) return rows.map(({ projectId: _p, ...rest }) => rest);
  return rows.filter((r) => r.projectId === projectId).map(({ projectId: _p, ...rest }) => rest);
}
