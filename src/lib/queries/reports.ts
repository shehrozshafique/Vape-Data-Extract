import { createClient } from "@/lib/supabase/server";
import { format, startOfWeek, startOfMonth } from "date-fns";

export type ReportGrouping = "day" | "week" | "month";

export interface ReportRow {
  bucket: string;
  competitorTotals: Record<string, number>;
  total: number;
}

export interface ActivityReport {
  rows: ReportRow[];
  competitorNames: string[];
  grandTotal: number;
}

function bucketKey(date: Date, grouping: ReportGrouping): string {
  if (grouping === "day") return format(date, "yyyy-MM-dd");
  if (grouping === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "'Week of' yyyy-MM-dd");
  return format(startOfMonth(date), "MMMM yyyy");
}

/** Backs the Daily/Weekly/Monthly Competitor Activity reports and their CSV/XLSX export. */
export async function getActivityReport(params: {
  from: string;
  to: string;
  grouping: ReportGrouping;
  competitorId?: string;
  competitorIds?: string[];
}): Promise<ActivityReport> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("first_seen_at, competitors(name)")
    .gte("first_seen_at", params.from)
    .lte("first_seen_at", params.to)
    .order("first_seen_at", { ascending: true });
  if (params.competitorId) query = query.eq("competitor_id", params.competitorId);
  else if (params.competitorIds && params.competitorIds.length > 0) query = query.in("competitor_id", params.competitorIds);
  else if (params.competitorIds && params.competitorIds.length === 0) {
    return { rows: [], competitorNames: [], grandTotal: 0 };
  }

  const { data } = await query;

  const rows = (data ?? []) as unknown as { first_seen_at: string; competitors: { name: string } | null }[];

  const competitorNames = Array.from(new Set(rows.map((r) => r.competitors?.name ?? "Unknown"))).sort();
  const byBucket = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const key = bucketKey(new Date(row.first_seen_at), params.grouping);
    const name = row.competitors?.name ?? "Unknown";
    const bucket = byBucket.get(key) ?? {};
    bucket[name] = (bucket[name] ?? 0) + 1;
    byBucket.set(key, bucket);
  }

  const reportRows: ReportRow[] = Array.from(byBucket.entries())
    .map(([bucket, competitorTotals]) => ({
      bucket,
      competitorTotals,
      total: Object.values(competitorTotals).reduce((sum, n) => sum + n, 0),
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  return { rows: reportRows, competitorNames, grandTotal: rows.length };
}
