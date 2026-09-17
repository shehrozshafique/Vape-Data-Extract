import { createClient } from "@/lib/supabase/server";
import { isoDateKey } from "@/lib/utils/dates";
import { eachDayOfInterval, format } from "date-fns";

export interface ActivityChartPoint {
  date: string; // yyyy-MM-dd
  [competitorName: string]: string | number;
}

export interface ActivityChartResult {
  points: ActivityChartPoint[];
  seriesNames: string[];
}

/**
 * Buckets first_seen_at by day and competitor for the activity chart. Fetches raw rows and
 * aggregates in-process rather than a SQL GROUP BY — at this scale (<=10 competitors, a
 * bounded date window) that's simpler than maintaining a materialized view and just as fast.
 */
export async function getActivityChartData(params: {
  from: string;
  to: string;
  competitorIds?: string[];
}): Promise<ActivityChartResult> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("first_seen_at, competitor_id, competitors(name)")
    .gte("first_seen_at", params.from)
    .lte("first_seen_at", params.to);

  if (params.competitorIds && params.competitorIds.length > 0) {
    query = query.in("competitor_id", params.competitorIds);
  }

  const { data } = await query;

  const rows = (data ?? []) as unknown as { first_seen_at: string; competitor_id: string; competitors: { name: string } | null }[];

  const seriesNames = Array.from(new Set(rows.map((r) => r.competitors?.name ?? "Unknown"))).sort();

  const byDate = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const day = isoDateKey(row.first_seen_at);
    const name = row.competitors?.name ?? "Unknown";
    const bucket = byDate.get(day) ?? {};
    bucket[name] = (bucket[name] ?? 0) + 1;
    byDate.set(day, bucket);
  }

  const days = eachDayOfInterval({ start: new Date(params.from), end: new Date(params.to) });
  const points: ActivityChartPoint[] = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const bucket = byDate.get(key) ?? {};
    const point: ActivityChartPoint = { date: key };
    for (const name of seriesNames) point[name] = bucket[name] ?? 0;
    return point;
  });

  return { points, seriesNames };
}
