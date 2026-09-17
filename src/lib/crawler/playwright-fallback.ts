import type { ExtractorConfig } from "@/lib/supabase/database.types";
import { extractProductFromHtml, type ExtractedProduct } from "./extract";

/**
 * Renders a product page in headless Chromium and extracts from the rendered DOM. This is the
 * fallback path for pages that return an empty client-rendered shell over plain fetch (see
 * `looksLikeEmptyRender`). Deliberately isolated behind a dynamic import: `playwright` is an
 * optional dependency, and on serverless hosts (e.g. Vercel functions) it typically isn't
 * available at all, in which case this throws and callers should record extraction as failed
 * rather than crash the whole scan. Run this fallback from a persistent Node worker
 * (self-hosted / VPS / dedicated crawler service) where `npx playwright install chromium` has
 * been run.
 */
export async function extractProductWithPlaywright(
  url: string,
  extractorConfig: ExtractorConfig,
): Promise<{ data: ExtractedProduct; error: null } | { data: null; error: string }> {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return { data: null, error: "Playwright is not installed in this environment" };
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: "Mozilla/5.0 (compatible; VapeCompetitorMonitor/1.0; +internal-tool)",
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    const html = await page.content();
    return { data: extractProductFromHtml(html, extractorConfig), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Playwright rendering failed" };
  } finally {
    await browser.close();
  }
}
