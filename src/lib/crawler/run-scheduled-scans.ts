import { createAdminClient } from "@/lib/supabase/admin";
import { scanCompetitor } from "./scan-competitor";

/**
 * Entry point for the cron trigger. Finds every active competitor that is due (next_scan_at
 * has passed, or it has never been scanned) and scans them independently — one competitor's
 * failure never stops the others. Each competitor is scanned at most once per UTC day.
 */
export async function runScheduledScans() {
  const supabase = createAdminClient();

  const { data: dueCompetitors, error } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("status", "active")
    .or(`next_scan_at.is.null,next_scan_at.lte.${new Date().toISOString()}`);

  if (error) {
    return { ran: 0, error: error.message };
  }

  const results = await Promise.allSettled(
    (dueCompetitors ?? []).map((competitor) => scanCompetitor(competitor.id, { trigger: "schedule" })),
  );

  return {
    ran: results.length,
    succeeded: results.filter((r) => r.status === "fulfilled" && !r.value.skipped).length,
    skipped: results.filter((r) => r.status === "fulfilled" && r.value.skipped).length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}
