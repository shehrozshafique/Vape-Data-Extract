import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string | null;
}

export interface SitemapFetchResult {
  urls: SitemapUrlEntry[];
  errors: string[];
  httpStatus: number | null;
  /** Stable hash over the final resolved URL set, used to skip work when nothing changed. */
  hash: string;
}

const FETCH_TIMEOUT_MS = 20_000;
const MAX_INDEX_DEPTH = 4;
const MAX_CHILD_SITEMAPS = 200;

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

function isGzipBuffer(buf: Buffer): boolean {
  return buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

async function fetchRaw(url: string): Promise<{ body: string; httpStatus: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VapeCompetitorMonitor/1.0; +internal-tool)",
        Accept: "application/xml,text/xml,*/*",
      },
    });

    const arrayBuffer = await res.arrayBuffer();
    let buf = Buffer.from(arrayBuffer);

    const looksGzipped =
      isGzipBuffer(buf) ||
      url.toLowerCase().endsWith(".gz") ||
      (res.headers.get("content-encoding") ?? "").includes("gzip") ||
      (res.headers.get("content-type") ?? "").includes("gzip");

    if (looksGzipped && isGzipBuffer(buf)) {
      buf = gunzipSync(buf);
    }

    if (!res.ok) {
      throw new HttpStatusError(res.status, `Sitemap request failed with HTTP ${res.status}`);
    }

    return { body: buf.toString("utf-8"), httpStatus: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

class HttpStatusError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Fetches a sitemap (or sitemap index) and returns every product-candidate URL it points to,
 * recursively following child sitemaps. Handles gzip, nested indexes, and tolerates individual
 * child-sitemap failures without aborting the whole fetch — each failure is recorded in `errors`.
 */
export async function fetchSitemapUrls(sitemapUrl: string): Promise<SitemapFetchResult> {
  const errors: string[] = [];
  const seenSitemaps = new Set<string>();
  const urlMap = new Map<string, string | null>();
  let rootHttpStatus: number | null = null;

  async function visit(url: string, depth: number): Promise<void> {
    if (seenSitemaps.has(url) || seenSitemaps.size >= MAX_CHILD_SITEMAPS) return;
    seenSitemaps.add(url);

    let body: string;
    try {
      const result = await fetchRaw(url);
      body = result.body;
      if (depth === 0) rootHttpStatus = result.httpStatus;
    } catch (err) {
      if (depth === 0 && err instanceof HttpStatusError) rootHttpStatus = err.status;
      errors.push(`${url}: ${err instanceof Error ? err.message : "fetch failed"}`);
      return;
    }

    let parsed: unknown;
    try {
      parsed = xmlParser.parse(body);
    } catch (err) {
      errors.push(`${url}: invalid XML (${err instanceof Error ? err.message : "parse error"})`);
      return;
    }

    const root = parsed as Record<string, unknown>;

    if (root.sitemapindex) {
      if (depth >= MAX_INDEX_DEPTH) {
        errors.push(`${url}: sitemap index nesting too deep, stopped following children`);
        return;
      }
      const entries = asArray<Record<string, unknown>>(
        (root.sitemapindex as Record<string, unknown>).sitemap as never,
      );
      for (const entry of entries) {
        const loc = typeof entry.loc === "string" ? entry.loc.trim() : null;
        if (loc) await visit(loc, depth + 1);
      }
      return;
    }

    if (root.urlset) {
      const entries = asArray<Record<string, unknown>>((root.urlset as Record<string, unknown>).url as never);
      for (const entry of entries) {
        const loc = typeof entry.loc === "string" ? entry.loc.trim() : null;
        if (!loc) continue;
        const lastmod = typeof entry.lastmod === "string" ? entry.lastmod.trim() : null;
        // If the same URL appears in multiple sitemap files, keep the most recent lastmod.
        const existing = urlMap.get(loc);
        if (!urlMap.has(loc) || (lastmod && (!existing || lastmod > existing))) {
          urlMap.set(loc, lastmod);
        }
      }
      return;
    }

    errors.push(`${url}: XML did not contain <urlset> or <sitemapindex>`);
  }

  await visit(sitemapUrl, 0);

  const urls: SitemapUrlEntry[] = Array.from(urlMap.entries())
    .map(([loc, lastmod]) => ({ loc, lastmod }))
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const hash = createHash("sha256").update(urls.map((u) => `${u.loc}|${u.lastmod ?? ""}`).join("\n")).digest("hex");

  return { urls, errors, httpStatus: rootHttpStatus, hash };
}
