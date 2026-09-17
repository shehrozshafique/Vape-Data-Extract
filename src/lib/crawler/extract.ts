import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import type { ExtractorConfig, ProductAvailability } from "@/lib/supabase/database.types";
import { parsePrice, normalizeAvailability } from "./parse-price";
import { extractVapeSpecs, type ExtractedSpecs } from "./spec-extraction";

export interface ExtractedProduct {
  name: string | null;
  brand: string | null;
  image_url: string | null;
  price: number | null;
  sale_price: number | null;
  currency: string | null;
  availability: ProductAvailability;
  sku: string | null;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  published_at: string | null;
  specs: ExtractedSpecs;
  contentHash: string;
}

const FETCH_TIMEOUT_MS = 20_000;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VapeCompetitorMonitor/1.0; +internal-tool)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstOf<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function flattenJsonLd(node: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => flattenJsonLd(item, out));
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (obj["@graph"]) flattenJsonLd(obj["@graph"], out);
  }
}

function isProductType(obj: Record<string, unknown>): boolean {
  const type = obj["@type"];
  if (typeof type === "string") return type.toLowerCase() === "product";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "product");
  return false;
}

function jsonLdImage(image: unknown): string | null {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return jsonLdImage(image[0]);
  if (image && typeof image === "object") {
    const obj = image as Record<string, unknown>;
    return textOrNull(obj.url);
  }
  return null;
}

function jsonLdBrand(brand: unknown): string | null {
  if (typeof brand === "string") return brand;
  if (brand && typeof brand === "object") {
    return textOrNull((brand as Record<string, unknown>).name);
  }
  return null;
}

function jsonLdOffer(offers: unknown): { price: string | null; currency: string | null; availability: string | null } {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") return { price: null, currency: null, availability: null };
  const obj = offer as Record<string, unknown>;
  return {
    price: textOrNull(obj.price) ?? (typeof obj.price === "number" ? String(obj.price) : null),
    currency: textOrNull(obj.priceCurrency),
    availability: textOrNull(obj.availability),
  };
}

/**
 * Extracts product data from an already-fetched HTML string using, in priority order: JSON-LD
 * structured data, OpenGraph tags, generic meta tags, then (only for fields still missing) the
 * competitor-specific CSS selectors from extractor_config. Missing fields stay null — nothing
 * here fabricates data. Pure/sync so both the plain-fetch path and the Playwright fallback can
 * share it.
 */
export function extractProductFromHtml(html: string, extractorConfig: ExtractorConfig): ExtractedProduct {
  const $ = cheerio.load(html);

  // 1. JSON-LD
  let ldName: string | null = null;
  let ldBrand: string | null = null;
  let ldImage: string | null = null;
  let ldSku: string | null = null;
  let ldDescription: string | null = null;
  let ldPrice: string | null = null;
  let ldCurrency: string | null = null;
  let ldAvailability: string | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw?.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const flat: Record<string, unknown>[] = [];
      flattenJsonLd(parsed, flat);
      const product = flat.find(isProductType);
      if (!product) return;

      ldName = firstOf(ldName, textOrNull(product.name));
      ldBrand = firstOf(ldBrand, jsonLdBrand(product.brand));
      ldImage = firstOf(ldImage, jsonLdImage(product.image));
      ldSku = firstOf(ldSku, textOrNull(product.sku) ?? textOrNull(product.mpn));
      ldDescription = firstOf(ldDescription, textOrNull(product.description));

      const offer = jsonLdOffer(product.offers);
      ldPrice = firstOf(ldPrice, offer.price);
      ldCurrency = firstOf(ldCurrency, offer.currency);
      ldAvailability = firstOf(ldAvailability, offer.availability);
    } catch {
      // Malformed JSON-LD on the page — ignore this block, other sources may still work.
    }
  });

  // 2. OpenGraph / product meta tags
  const og = (prop: string) => textOrNull($(`meta[property="${prop}"]`).attr("content"));
  const ogTitle = og("og:title");
  const ogImage = og("og:image");
  const ogDescription = og("og:description");
  const ogBrand = firstOf(og("product:brand"), og("og:brand"));
  const ogPriceAmount = firstOf(og("product:price:amount"), og("og:price:amount"));
  const ogPriceCurrency = firstOf(og("product:price:currency"), og("og:price:currency"));
  const ogAvailability = firstOf(og("product:availability"), og("og:availability"));
  const publishedTime = firstOf(og("article:published_time"), textOrNull($('meta[name="date"]').attr("content")));

  // 3. Generic meta tags
  const metaTitle = firstOf(textOrNull($("title").first().text()), ogTitle);
  const metaDescription = firstOf(textOrNull($('meta[name="description"]').attr("content")), ogDescription);
  const canonical = textOrNull($('link[rel="canonical"]').attr("href"));

  // 4. Competitor-specific selector fallback (only used when everything above came up empty)
  const bySelector = (selector?: string) => (selector ? textOrNull($(selector).first().text()) : null);
  const attrBySelector = (selector: string | undefined, attr: string) =>
    selector ? textOrNull($(selector).first().attr(attr)) : null;

  const name = firstOf(ldName, ogTitle, bySelector(extractorConfig.titleSelector), metaTitle);
  const brand = firstOf(ldBrand, ogBrand, bySelector(extractorConfig.brandSelector));
  const image_url = firstOf(ldImage, ogImage, attrBySelector(extractorConfig.imageSelector, "src"));
  const sku = firstOf(ldSku, bySelector(extractorConfig.skuSelector));
  const description = firstOf(ldDescription, ogDescription);

  const priceRaw = firstOf(ldPrice, ogPriceAmount, bySelector(extractorConfig.priceSelector));
  const parsedPrice = parsePrice(priceRaw);
  const currency = firstOf(parsedPrice?.currency ?? null, ldCurrency, ogPriceCurrency);

  const availabilityRaw = firstOf(ldAvailability, ogAvailability, bySelector(extractorConfig.availabilitySelector));
  const availability = normalizeAvailability(availabilityRaw);

  const specText = [name, description, metaDescription].filter(Boolean).join(" ");
  const specs = extractVapeSpecs(specText);

  const contentHash = createHash("sha256")
    .update(JSON.stringify({ name, brand, price: parsedPrice?.amount, availability, description }))
    .digest("hex");

  return {
    name,
    brand,
    image_url,
    price: parsedPrice?.amount ?? null,
    sale_price: null,
    currency,
    availability,
    sku,
    description,
    meta_title: metaTitle,
    meta_description: metaDescription,
    canonical_url: canonical,
    published_at: publishedTime,
    specs,
    contentHash,
  };
}

/**
 * Signals from the HTML that suggest the page is a client-rendered shell with no real content
 * yet (common on JS-heavy storefronts) — a cue to retry with the Playwright fallback rather
 * than trusting an extraction that found almost nothing.
 */
export function looksLikeEmptyRender(html: string): boolean {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().trim();
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const hasOgTitle = Boolean($('meta[property="og:title"]').attr("content"));
  const looksLikeChallenge = /just a moment|checking your browser|cf-browser-verification/i.test(bodyText.slice(0, 2000));

  return looksLikeChallenge || (bodyText.length < 200 && !hasJsonLd && !hasOgTitle);
}

/**
 * Fetches a product page over plain HTTP and extracts data from it. If the page appears to be
 * an empty client-rendered shell, callers should fall back to `extractProductWithPlaywright`.
 */
export async function extractProductFromUrl(
  url: string,
  extractorConfig: ExtractorConfig,
): Promise<{ data: ExtractedProduct; html: string; error: null } | { data: null; html: null; error: string }> {
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    return { data: null, html: null, error: err instanceof Error ? err.message : "Failed to fetch product page" };
  }

  return { data: extractProductFromHtml(html, extractorConfig), html, error: null };
}
