// Tracking/marketing params that never change what page loads — safe to strip so the same
// product reached via different ad campaigns still dedupes to one normalized URL.
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gclsrc",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "igshid",
  "_ga",
  "_gl",
  "spm",
]);

/**
 * Normalizes a product URL so the same product reached through slightly different links
 * (tracking params, trailing slash, www, http vs https) dedupes to one database row.
 * Returns null if the input isn't a parseable absolute URL.
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // Prefer https for comparison purposes — most sites redirect http->https anyway, and we
  // don't want the same product to appear twice just because one link used http.
  url.protocol = "https:";

  url.hostname = url.hostname.toLowerCase();
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
  }

  // Default ports carry no meaning.
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  const keptParams: [string, string][] = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      keptParams.push([key, value]);
    }
  }
  keptParams.sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of keptParams) {
    url.searchParams.append(key, value);
  }

  url.hash = "";

  // Trailing slash normalization (keep root "/").
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

/** Extracts a normalized bare hostname (no protocol, no www) from any URL, for the
 * competitor `domain` column. */
export function extractDomain(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
