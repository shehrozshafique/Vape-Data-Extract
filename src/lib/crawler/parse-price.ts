const CURRENCY_SYMBOLS: Record<string, string> = {
  "£": "GBP",
  "$": "USD",
  "€": "EUR",
};

export interface ParsedPrice {
  amount: number;
  currency: string | null;
}

/** Parses loosely-formatted price strings ("£24.99", "24.99 GBP", "1,299.00") from HTML/JSON-LD. */
export function parsePrice(raw: string | number | null | undefined): ParsedPrice | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? { amount: raw, currency: null } : null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  let currency: string | null = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (trimmed.includes(symbol)) {
      currency = code;
      break;
    }
  }
  const isoMatch = trimmed.match(/\b(GBP|USD|EUR|AUD|CAD)\b/i);
  if (isoMatch) currency = isoMatch[1].toUpperCase();

  const numberMatch = trimmed.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!numberMatch) return null;

  const amount = Number.parseFloat(numberMatch[0]);
  if (!Number.isFinite(amount)) return null;

  return { amount, currency };
}

export function normalizeAvailability(raw: string | null | undefined): "in_stock" | "out_of_stock" | "preorder" | "discontinued" | "unknown" {
  if (!raw) return "unknown";
  const value = raw.toLowerCase();

  if (value.includes("preorder") || value.includes("pre-order") || value.includes("presale")) return "preorder";
  if (value.includes("discontinued")) return "discontinued";
  if (value.includes("outofstock") || value.includes("out of stock") || value.includes("sold out") || value.includes("soldout")) {
    return "out_of_stock";
  }
  if (value.includes("instock") || value.includes("in stock") || value.includes("available")) return "in_stock";

  return "unknown";
}
