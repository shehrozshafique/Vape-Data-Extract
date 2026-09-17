import { createClient } from "@/lib/supabase/server";
import { getDateRangeForPreset, dayBoundsFor } from "@/lib/utils/dates";
import { getTaskStatuses } from "./task-statuses";

export interface DashboardKpis {
  newToday: number;
  newYesterday: number;
  newThisWeek: number;
  newThisMonth: number;
  toDo: number;
  pending: number;
  processing: number;
  done: number;
  notNeed: number;
  activeCompetitors: number;
}

async function countProductsSince(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string,
  competitorId?: string,
  competitorIds?: string[],
) {
  let query = supabase.from("products").select("id", { count: "exact", head: true }).gte("first_seen_at", from).lte("first_seen_at", to);
  if (competitorId) query = query.eq("competitor_id", competitorId);
  else if (competitorIds && competitorIds.length > 0) query = query.in("competitor_id", competitorIds);
  else if (competitorIds && competitorIds.length === 0) return 0;
  const { count } = await query;
  return count ?? 0;
}

export async function getDashboardKpis(competitorId?: string, projectCompetitorIds?: string[]): Promise<DashboardKpis> {
  const supabase = await createClient();
  const today = getDateRangeForPreset("today");
  const yesterday = getDateRangeForPreset("yesterday");
  const thisWeek = getDateRangeForPreset("this_week");
  const thisMonth = getDateRangeForPreset("this_month");
  const statuses = await getTaskStatuses();

  const byKey = (key: string) => statuses.find((s) => s.key === key)?.id;
  const scopeIds = competitorId ? [competitorId] : projectCompetitorIds;

  const countTasksByStatus = async (key: string) => {
    const statusId = byKey(key);
    if (!statusId) return 0;
    let query = supabase.from("tasks").select("id, products!inner(competitor_id)", { count: "exact", head: true }).eq("status_id", statusId);
    if (competitorId) query = query.eq("products.competitor_id", competitorId);
    else if (scopeIds && scopeIds.length > 0) query = query.in("products.competitor_id", scopeIds);
    else if (scopeIds && scopeIds.length === 0) return 0;
    const { count } = await query;
    return count ?? 0;
  };

  let activeQuery = supabase.from("competitors").select("id", { count: "exact", head: true }).eq("status", "active");
  if (scopeIds && scopeIds.length > 0) activeQuery = activeQuery.in("id", scopeIds);
  else if (scopeIds && scopeIds.length === 0) {
    /* empty project */
  }

  const [newToday, newYesterday, newThisWeek, newThisMonth, toDo, pending, processing, done, notNeed, activeCompetitorsResult] =
    await Promise.all([
      countProductsSince(supabase, today.from, today.to, competitorId, projectCompetitorIds),
      countProductsSince(supabase, yesterday.from, yesterday.to, competitorId, projectCompetitorIds),
      countProductsSince(supabase, thisWeek.from, thisWeek.to, competitorId, projectCompetitorIds),
      countProductsSince(supabase, thisMonth.from, thisMonth.to, competitorId, projectCompetitorIds),
      countTasksByStatus("to_do"),
      countTasksByStatus("pending"),
      countTasksByStatus("processing"),
      countTasksByStatus("done"),
      countTasksByStatus("not_need"),
      scopeIds && scopeIds.length === 0 ? Promise.resolve({ count: 0 }) : activeQuery,
    ]);

  return {
    newToday,
    newYesterday,
    newThisWeek,
    newThisMonth,
    toDo,
    pending,
    processing,
    done,
    notNeed,
    activeCompetitors: activeCompetitorsResult.count ?? 0,
  };
}

export interface CompetitorActivityRow {
  id: string;
  name: string;
  logo_url: string | null;
  status: "active" | "paused";
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  totalProducts: number;
  lastScanAt: string | null;
  nextScanAt: string | null;
}

/** Powers the Competitor Activity Table — the single most important dashboard widget: how many
 * products each competitor published, at a glance, per time window. */
export async function getCompetitorActivityTable(projectId?: string | null): Promise<CompetitorActivityRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("competitors")
    .select("id, name, logo_url, status, last_scan_at, next_scan_at")
    .order("name", { ascending: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { data: competitors } = await query;

  if (!competitors || competitors.length === 0) return [];

  const today = getDateRangeForPreset("today");
  const yesterday = getDateRangeForPreset("yesterday");
  const last7 = getDateRangeForPreset("last_7_days");
  const last30 = getDateRangeForPreset("last_30_days");

  const rows = await Promise.all(
    competitors.map(async (competitor) => {
      const [todayCount, yesterdayCount, last7Count, last30Count, totalCount] = await Promise.all([
        countProductsSince(supabase, today.from, today.to, competitor.id),
        countProductsSince(supabase, yesterday.from, yesterday.to, competitor.id),
        countProductsSince(supabase, last7.from, last7.to, competitor.id),
        countProductsSince(supabase, last30.from, last30.to, competitor.id),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("competitor_id", competitor.id),
      ]);

      return {
        id: competitor.id,
        name: competitor.name,
        logo_url: competitor.logo_url,
        status: competitor.status,
        today: todayCount,
        yesterday: yesterdayCount,
        last7Days: last7Count,
        last30Days: last30Count,
        totalProducts: totalCount.count ?? 0,
        lastScanAt: competitor.last_scan_at,
        nextScanAt: competitor.next_scan_at,
      };
    }),
  );

  return rows;
}

export interface LatestProductRow {
  id: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  first_seen_at: string;
  competitorName: string;
  statusLabel: string | null;
  statusColor: string | null;
  taskId: string | null;
}

export async function getLatestProducts(limit = 8, competitorId?: string, projectCompetitorIds?: string[]): Promise<LatestProductRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, name, brand, image_url, price, currency, first_seen_at, competitor_id, competitors(name), tasks(id, task_statuses(label, color))",
    )
    .order("first_seen_at", { ascending: false })
    .limit(limit);
  if (competitorId) query = query.eq("competitor_id", competitorId);
  else if (projectCompetitorIds && projectCompetitorIds.length > 0) query = query.in("competitor_id", projectCompetitorIds);
  else if (projectCompetitorIds && projectCompetitorIds.length === 0) return [];

  const { data } = await query;
  if (!data) return [];

  return data.map((row) => {
    const record = row as unknown as {
      id: string;
      name: string | null;
      brand: string | null;
      image_url: string | null;
      price: number | null;
      currency: string;
      first_seen_at: string;
      competitors: { name: string } | null;
      tasks: { id: string; task_statuses: { label: string; color: string } | null } | null;
    };
    return {
      id: record.id,
      name: record.name,
      brand: record.brand,
      image_url: record.image_url,
      price: record.price,
      currency: record.currency,
      first_seen_at: record.first_seen_at,
      competitorName: record.competitors?.name ?? "Unknown",
      statusLabel: record.tasks?.task_statuses?.label ?? null,
      statusColor: record.tasks?.task_statuses?.color ?? null,
      taskId: record.tasks?.id ?? null,
    };
  });
}

export interface DateCompetitorBreakdownRow {
  competitorId: string;
  competitorName: string;
  count: number;
}

export async function getDateCompetitorBreakdown(
  date: Date,
  projectId?: string | null,
): Promise<{ rows: DateCompetitorBreakdownRow[]; total: number }> {
  const supabase = await createClient();
  const { from, to } = dayBoundsFor(date);

  let query = supabase.from("competitors").select("id, name").order("name", { ascending: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { data: competitors } = await query;
  if (!competitors) return { rows: [], total: 0 };

  const rows = await Promise.all(
    competitors.map(async (competitor) => {
      const count = await countProductsSince(supabase, from, to, competitor.id);
      return { competitorId: competitor.id, competitorName: competitor.name, count };
    }),
  );

  return { rows, total: rows.reduce((sum, row) => sum + row.count, 0) };
}
