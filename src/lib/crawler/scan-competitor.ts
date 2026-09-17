import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, ScanTrigger } from "@/lib/supabase/database.types";
import { fetchSitemapUrls } from "./sitemap";
import { isProductUrl } from "./url-classifier";
import { normalizeUrl } from "./normalize-url";
import { extractProductFromUrl, looksLikeEmptyRender } from "./extract";
import { extractProductWithPlaywright } from "./playwright-fallback";
import { hasAnySpec } from "./spec-extraction";
import { POSSIBLY_REMOVED_THRESHOLD } from "@/lib/constants";

type Competitor = Database["public"]["Tables"]["competitors"]["Row"];

export interface ScanOutcome {
  skipped: boolean;
  skipReason?: string;
  scanId?: string;
  newUrls?: number;
  existingUrls?: number;
  missingUrls?: number;
  errorCount?: number;
}

function toIsoOrNull(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Next midnight UTC — used so each competitor is checked at most once per calendar day. */
function nextMidnightUtc(from = new Date()): string {
  const next = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1, 0, 0, 0, 0));
  return next.toISOString();
}

function wasScannedTodayUtc(lastScanAt: string | null): boolean {
  if (!lastScanAt) return false;
  const last = new Date(lastScanAt);
  const now = new Date();
  return (
    last.getUTCFullYear() === now.getUTCFullYear() &&
    last.getUTCMonth() === now.getUTCMonth() &&
    last.getUTCDate() === now.getUTCDate()
  );
}

/**
 * Runs one full scan of a single competitor: fetch sitemap(s) -> classify product URLs ->
 * normalize -> diff against the database -> extract data for genuinely new products ->
 * create tasks (unless this is the baseline scan) -> record scan history. Never throws for
 * per-competitor crawl failures (bad sitemap, network error, etc.) — those are recorded on
 * the scan row and returned, so the scheduler can move on to the next competitor.
 */
export async function scanCompetitor(
  competitorId: string,
  opts: { trigger: ScanTrigger; triggeredByUserId?: string },
): Promise<ScanOutcome> {
  const supabase = createAdminClient();

  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", competitorId)
    .single();

  if (competitorError || !competitor) {
    return { skipped: true, skipReason: "Competitor not found" };
  }

  // Scheduled scans: at most once per UTC calendar day.
  if (opts.trigger === "schedule" && wasScannedTodayUtc(competitor.last_scan_at)) {
    return { skipped: true, skipReason: "Already scanned today" };
  }

  const isBaselineScan = !competitor.baseline_completed_at;
  const startedAt = new Date();

  const { data: scanRow, error: insertScanError } = await supabase
    .from("sitemap_scans")
    .insert({
      competitor_id: competitorId,
      status: "running",
      is_baseline: isBaselineScan,
      triggered_by: opts.trigger,
      triggered_by_user: opts.triggeredByUserId ?? null,
      started_at: startedAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertScanError || !scanRow) {
    // Most likely the partial unique index blocked a second concurrent scan for this competitor.
    if (insertScanError?.code === "23505") {
      return { skipped: true, skipReason: "A scan is already running for this competitor" };
    }
    return { skipped: true, skipReason: insertScanError?.message ?? "Could not start scan" };
  }

  const scanId = scanRow.id as string;

  try {
    const result = await runScan(supabase, competitor, isBaselineScan);

    await supabase
      .from("sitemap_scans")
      .update({
        completed_at: new Date().toISOString(),
        status: result.errors.length > 0 ? (result.totalUrls > 0 ? "partial_error" : "failed") : "success",
        total_urls: result.totalUrls,
        new_urls: result.newUrls,
        existing_urls: result.existingUrls,
        missing_urls: result.missingUrls,
        error_count: result.errors.length,
        error_message: result.errors.length > 0 ? result.errors.slice(0, 20).join("\n") : null,
        sitemap_hash: result.hash,
        http_status: result.httpStatus,
        duration_ms: Date.now() - startedAt.getTime(),
      })
      .eq("id", scanId);

    await supabase
      .from("competitors")
      .update({
        last_scan_at: new Date().toISOString(),
        next_scan_at: nextMidnightUtc(),
        last_sitemap_hash: result.hash,
        baseline_completed_at: competitor.baseline_completed_at ?? new Date().toISOString(),
      })
      .eq("id", competitorId);

    if (result.newUrls > 0 && !isBaselineScan) {
      await supabase.from("notifications").insert({
        user_id: null,
        type: "new_products",
        title: `${result.newUrls} new product${result.newUrls === 1 ? "" : "s"} found`,
        message: `${competitor.name} published ${result.newUrls} new product${result.newUrls === 1 ? "" : "s"}.`,
        link: `/tasks?competitor=${competitorId}`,
        competitor_id: competitorId,
      });
    }

    if (result.errors.length > 0 && result.totalUrls === 0) {
      await supabase.from("notifications").insert({
        user_id: null,
        type: "scan_failed",
        title: `Sitemap scan failed for ${competitor.name}`,
        message: result.errors[0] ?? "The sitemap could not be read.",
        link: `/competitors/${competitorId}`,
        competitor_id: competitorId,
      });
    }

    return {
      skipped: false,
      scanId,
      newUrls: result.newUrls,
      existingUrls: result.existingUrls,
      missingUrls: result.missingUrls,
      errorCount: result.errors.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown crawler error";
    await supabase
      .from("sitemap_scans")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_count: 1,
        error_message: message,
        duration_ms: Date.now() - startedAt.getTime(),
      })
      .eq("id", scanId);

    await supabase
      .from("competitors")
      .update({
        last_scan_at: new Date().toISOString(),
        next_scan_at: nextMidnightUtc(),
      })
      .eq("id", competitorId);

    await supabase.from("notifications").insert({
      user_id: null,
      type: "scan_failed",
      title: `Sitemap scan failed for ${competitor.name}`,
      message,
      link: `/competitors/${competitorId}`,
      competitor_id: competitorId,
    });

    return { skipped: false, scanId, errorCount: 1 };
  }
}

interface RunScanResult {
  totalUrls: number;
  newUrls: number;
  existingUrls: number;
  missingUrls: number;
  errors: string[];
  hash: string;
  httpStatus: number | null;
}

async function runScan(
  supabase: ReturnType<typeof createAdminClient>,
  competitor: Competitor,
  isBaselineScan: boolean,
): Promise<RunScanResult> {
  const sitemapTargets = Array.from(
    new Set([competitor.product_sitemap_url, competitor.sitemap_url].filter((v): v is string => Boolean(v))),
  );

  const errors: string[] = [];
  const merged = new Map<string, string | null>();
  let httpStatus: number | null = null;

  for (const target of sitemapTargets) {
    const result = await fetchSitemapUrls(target);
    errors.push(...result.errors);
    if (httpStatus === null) httpStatus = result.httpStatus;
    for (const entry of result.urls) {
      const existing = merged.get(entry.loc);
      if (!merged.has(entry.loc) || (entry.lastmod && (!existing || entry.lastmod > existing))) {
        merged.set(entry.loc, entry.lastmod);
      }
    }
  }

  const combinedHash = Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([loc, lastmod]) => `${loc}|${lastmod ?? ""}`)
    .join("\n");
  const hash = createHash("sha256").update(combinedHash).digest("hex");

  if (merged.size === 0) {
    return { totalUrls: 0, newUrls: 0, existingUrls: 0, missingUrls: 0, errors, hash, httpStatus };
  }

  // Fast path: sitemap is byte-for-byte the same URL set as last time, so no product's
  // presence status can have changed. Skip the (potentially large) diff entirely.
  if (competitor.last_sitemap_hash && competitor.last_sitemap_hash === hash && competitor.baseline_completed_at) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("competitor_id", competitor.id);
    return { totalUrls: count ?? merged.size, newUrls: 0, existingUrls: count ?? merged.size, missingUrls: 0, errors, hash, httpStatus };
  }

  // Classify + normalize.
  const productUrlMap = new Map<string, string | null>();
  for (const [loc, lastmod] of merged.entries()) {
    if (!isProductUrl(loc, competitor.include_patterns, competitor.exclude_patterns)) continue;
    const normalized = normalizeUrl(loc);
    if (!normalized) continue;
    const existing = productUrlMap.get(normalized);
    if (!productUrlMap.has(normalized) || (lastmod && (!existing || lastmod > existing))) {
      productUrlMap.set(normalized, lastmod);
    }
  }

  const { data: existingProducts, error: existingError } = await supabase
    .from("products")
    .select("id, normalized_url, missing_from_sitemap, missing_scan_count, source_last_modified_at")
    .eq("competitor_id", competitor.id);

  if (existingError) {
    errors.push(`Failed to load existing products: ${existingError.message}`);
    return { totalUrls: productUrlMap.size, newUrls: 0, existingUrls: 0, missingUrls: 0, errors, hash, httpStatus };
  }

  const existingByUrl = new Map(existingProducts.map((p) => [p.normalized_url, p]));

  const newEntries: { url: string; lastmod: string | null }[] = [];
  const seenExistingIds = new Set<string>();

  for (const [normalizedUrl, lastmod] of productUrlMap.entries()) {
    const existing = existingByUrl.get(normalizedUrl);
    if (existing) {
      seenExistingIds.add(existing.id);
    } else {
      newEntries.push({ url: normalizedUrl, lastmod });
    }
  }

  // Mark present products as seen (reset any missing streak).
  const presentProducts = existingProducts.filter((p) => seenExistingIds.has(p.id));
  const presentIds = presentProducts.map((p) => p.id);
  if (presentIds.length > 0) {
    await supabase
      .from("products")
      .update({ last_seen_at: new Date().toISOString(), missing_from_sitemap: false, missing_scan_count: 0, possibly_removed: false })
      .in("id", presentIds);
  }

  // The sitemap's <lastmod> is only supporting information (never the "new product" signal),
  // but it should still stay in sync for products whose competitor genuinely bumped it —
  // only touch rows where the value actually changed, to keep this cheap on unchanged scans.
  for (const product of presentProducts) {
    const latestLastmod = toIsoOrNull(productUrlMap.get(product.normalized_url) ?? null);
    if (latestLastmod && latestLastmod !== product.source_last_modified_at) {
      await supabase.from("products").update({ source_last_modified_at: latestLastmod }).eq("id", product.id);
    }
  }

  // Products previously known for this competitor but absent from this scan's URL set.
  const missingProducts = existingProducts.filter((p) => !seenExistingIds.has(p.id));
  for (const product of missingProducts) {
    const nextMissingCount = product.missing_scan_count + 1;
    await supabase
      .from("products")
      .update({
        missing_from_sitemap: true,
        missing_scan_count: nextMissingCount,
        first_missing_at: product.missing_from_sitemap ? undefined : new Date().toISOString(),
        possibly_removed: nextMissingCount >= POSSIBLY_REMOVED_THRESHOLD,
      })
      .eq("id", product.id);
  }

  // New products: fetch + extract, then insert product (+specs, +task for non-baseline scans).
  let defaultStatusId: string | null = null;
  if (!isBaselineScan || competitor.baseline_import_as_tasks) {
    const { data: defaultStatus } = await supabase.from("task_statuses").select("id").eq("is_default", true).single();
    defaultStatusId = defaultStatus?.id ?? null;
  }

  for (const entry of newEntries) {
    try {
      let extraction = await extractProductFromUrl(entry.url, competitor.extractor_config);
      if (extraction.data && looksLikeEmptyRender(extraction.html)) {
        const fallback = await extractProductWithPlaywright(entry.url, competitor.extractor_config);
        if (fallback.data) extraction = { data: fallback.data, html: extraction.html, error: null };
      }

      const now = new Date().toISOString();
      const { data: insertedProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          competitor_id: competitor.id,
          product_url: entry.url,
          normalized_url: entry.url,
          name: extraction.data?.name ?? null,
          brand: extraction.data?.brand ?? null,
          canonical_url: extraction.data?.canonical_url ?? null,
          image_url: extraction.data?.image_url ?? null,
          price: extraction.data?.price ?? null,
          sale_price: extraction.data?.sale_price ?? null,
          currency: extraction.data?.currency ?? "GBP",
          availability: extraction.data?.availability ?? "unknown",
          sku: extraction.data?.sku ?? null,
          description: extraction.data?.description ?? null,
          meta_title: extraction.data?.meta_title ?? null,
          meta_description: extraction.data?.meta_description ?? null,
          discovery_source: "sitemap",
          sitemap_url: competitor.product_sitemap_url ?? competitor.sitemap_url,
          source_last_modified_at: toIsoOrNull(entry.lastmod),
          published_at: toIsoOrNull(extraction.data?.published_at ?? null),
          first_seen_at: now,
          last_seen_at: now,
          is_baseline: isBaselineScan,
          content_hash: extraction.data?.contentHash ?? null,
          extraction_status: extraction.error ? "failed" : "success",
          extraction_error: extraction.error,
          last_extracted_at: now,
        })
        .select("id")
        .single();

      if (insertError || !insertedProduct) {
        if (insertError?.code !== "23505") errors.push(`${entry.url}: ${insertError?.message ?? "insert failed"}`);
        continue;
      }

      if (extraction.data && hasAnySpec(extraction.data.specs)) {
        await supabase.from("product_specs").insert({ product_id: insertedProduct.id, ...extraction.data.specs });
      }

      if (defaultStatusId) {
        await supabase.from("tasks").insert({
          product_id: insertedProduct.id,
          status_id: defaultStatusId,
          priority: "normal",
        });
      }
    } catch (err) {
      errors.push(`${entry.url}: ${err instanceof Error ? err.message : "extraction failed"}`);
    }
  }

  return {
    totalUrls: productUrlMap.size,
    newUrls: newEntries.length,
    existingUrls: seenExistingIds.size,
    missingUrls: missingProducts.length,
    errors,
    hash,
    httpStatus,
  };
}
