import { createClient } from "@/lib/supabase/server";

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  message: string;
  link?: string;
  kind: "scan" | "new_product" | "status_change" | "scan_failed";
}

/**
 * The Today/Activity feed is deliberately not backed by its own log table — every event it
 * shows already exists as a real row somewhere (a completed scan, a newly first-seen product,
 * a task status change), so this just reads and merges those instead of duplicating state.
 */
export async function getActivityFeed(limit = 60, competitorIds?: string[]): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();

  let scansQuery = supabase
    .from("sitemap_scans")
    .select("id, completed_at, status, new_urls, error_message, competitor_id, competitors(id, name)")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(40);
  let productsQuery = supabase
    .from("products")
    .select("id, name, first_seen_at, is_baseline, competitor_id, competitors(id, name)")
    .eq("is_baseline", false)
    .order("first_seen_at", { ascending: false })
    .limit(40);

  if (competitorIds && competitorIds.length > 0) {
    scansQuery = scansQuery.in("competitor_id", competitorIds);
    productsQuery = productsQuery.in("competitor_id", competitorIds);
  } else if (competitorIds && competitorIds.length === 0) {
    return [];
  }

  const [scansRes, productsRes, historyRes] = await Promise.all([
    scansQuery,
    productsQuery,
    supabase
      .from("task_history")
      .select("id, changed_at, task_id, new_status_id, tasks(product_id, products(name, competitor_id)), task_statuses!task_history_new_status_id_fkey(label), profiles(name, email)")
      .order("changed_at", { ascending: false })
      .limit(40),
  ]);

  const items: ActivityFeedItem[] = [];

  for (const scan of (scansRes.data ?? []) as unknown as {
    id: string;
    completed_at: string;
    status: string;
    new_urls: number;
    error_message: string | null;
    competitors: { id: string; name: string } | null;
  }[]) {
    const competitorName = scan.competitors?.name ?? "Unknown competitor";
    if (scan.status === "failed" || scan.status === "partial_error") {
      items.push({
        id: `scan-${scan.id}`,
        timestamp: scan.completed_at,
        kind: "scan_failed",
        message: `Sitemap scan failed for ${competitorName}${scan.error_message ? `: ${scan.error_message.split("\n")[0]}` : ""}`,
        link: scan.competitors ? `/competitors/${scan.competitors.id}` : undefined,
      });
    } else if (scan.new_urls > 0) {
      items.push({
        id: `scan-${scan.id}`,
        timestamp: scan.completed_at,
        kind: "scan",
        message: `${scan.new_urls} new product${scan.new_urls === 1 ? "" : "s"} detected from ${competitorName}`,
        link: scan.competitors ? `/tasks?competitor=${scan.competitors.id}` : undefined,
      });
    } else {
      items.push({
        id: `scan-${scan.id}`,
        timestamp: scan.completed_at,
        kind: "scan",
        message: `Sitemap scan completed for ${competitorName}`,
        link: scan.competitors ? `/competitors/${scan.competitors.id}` : undefined,
      });
    }
  }

  for (const product of (productsRes.data ?? []) as unknown as {
    id: string;
    name: string | null;
    first_seen_at: string;
    competitors: { id: string; name: string } | null;
  }[]) {
    items.push({
      id: `product-${product.id}`,
      timestamp: product.first_seen_at,
      kind: "new_product",
      message: `New product detected: ${product.name ?? "Untitled product"}`,
      link: `/tasks?search=${encodeURIComponent(product.name ?? "")}`,
    });
  }

  for (const entry of (historyRes.data ?? []) as unknown as {
    id: string;
    changed_at: string;
    task_id: string;
    tasks: { product_id: string; products: { name: string | null; competitor_id: string } | null } | null;
    task_statuses: { label: string } | null;
    profiles: { name: string | null; email: string } | null;
  }[]) {
    if (competitorIds && competitorIds.length > 0) {
      const cid = entry.tasks?.products?.competitor_id;
      if (!cid || !competitorIds.includes(cid)) continue;
    }
    const who = entry.profiles?.name ?? entry.profiles?.email ?? "the system";
    const productName = entry.tasks?.products?.name ?? "a product";
    const statusLabel = entry.task_statuses?.label ?? "a new status";
    items.push({
      id: `history-${entry.id}`,
      timestamp: entry.changed_at,
      kind: "status_change",
      message: `${productName} marked ${statusLabel} by ${who}`,
      link: `/tasks/${entry.task_id}`,
    });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
