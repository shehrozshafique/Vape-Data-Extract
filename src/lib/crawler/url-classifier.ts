// Applied whenever a competitor has no admin-configured exclude patterns yet, so the very
// first (pre-configuration) scan doesn't flood the baseline with obvious non-product pages.
const DEFAULT_EXCLUDE_SEGMENTS = [
  "/collections/",
  "/collection/",
  "/category/",
  "/categories/",
  "/blog/",
  "/blogs/",
  "/news/",
  "/page/",
  "/pages/",
  "/tag/",
  "/tags/",
  "/brand/",
  "/brands/",
  "/vendor/",
  "/vendors/",
  "/search",
  "/cart",
  "/checkout",
  "/account",
  "/policies/",
  "/policy/",
  "/about",
  "/contact",
  "/faq",
  "/wishlist",
  "/login",
  "/register",
];

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(escaped, "i");
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Decides whether a discovered sitemap URL is a real product page, using the competitor's
 * configured include/exclude patterns (simple substrings or `*`-wildcard globs, matched
 * against the URL). Exclude always wins. If include patterns are configured, the URL must
 * match at least one. If none are configured, a conservative default exclude list is used
 * so collections/blogs/etc. don't get treated as products before an admin configures rules.
 */
export function isProductUrl(url: string, includePatterns: string[], excludePatterns: string[]): boolean {
  const pathname = pathnameOf(url);

  const effectiveExcludes = excludePatterns.length > 0 ? excludePatterns : DEFAULT_EXCLUDE_SEGMENTS;
  for (const pattern of effectiveExcludes) {
    if (patternToRegExp(pattern).test(pathname)) return false;
  }

  if (includePatterns.length > 0) {
    return includePatterns.some((pattern) => patternToRegExp(pattern).test(pathname));
  }

  return true;
}
