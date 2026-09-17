import type { PrefilledOrRefillable } from "@/lib/supabase/database.types";

export interface ExtractedSpecs {
  device_type: string | null;
  puff_count: number | null;
  battery_capacity: string | null;
  liquid_capacity: string | null;
  nicotine_strength: string | null;
  pod_type: string | null;
  prefilled_or_refillable: PrefilledOrRefillable | null;
  flavour_count: number | null;
  coil_type: string | null;
  wattage: string | null;
  charging_type: string | null;
}

const EMPTY_SPECS: ExtractedSpecs = {
  device_type: null,
  puff_count: null,
  battery_capacity: null,
  liquid_capacity: null,
  nicotine_strength: null,
  pod_type: null,
  prefilled_or_refillable: null,
  flavour_count: null,
  coil_type: null,
  wattage: null,
  charging_type: null,
};

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = Number.parseInt(match[1].replace(/,/g, ""), 10);
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

const DEVICE_TYPES = ["disposable", "pod kit", "pod system", "vape kit", "box mod", "mod kit", "tank", "starter kit", "AIO kit"];
const COIL_TYPES = ["mesh coil", "ceramic coil", "kanthal coil", "mesh", "ceramic"];
const CHARGING_TYPES = ["usb-c", "usb type-c", "type-c", "usb-a", "micro usb", "micro-usb", "magnetic charging", "wireless charging"];

/**
 * Best-effort vape-specific spec extraction from free text (title + description + any
 * structured attributes already pulled from the page). Never invents values — a field the
 * text doesn't clearly mention stays null rather than being guessed.
 */
export function extractVapeSpecs(text: string): ExtractedSpecs {
  if (!text) return { ...EMPTY_SPECS };
  const lower = text.toLowerCase();

  const device_type = DEVICE_TYPES.find((type) => lower.includes(type)) ?? null;

  const puff_count = firstNumber(lower, [/([\d,]+)\s*\+?\s*puffs?\b/]);

  const battery_capacity = firstMatch(lower, [/\b\d{2,5}\s?m?ah\b/]);

  const liquid_capacity = firstMatch(lower, [/\b\d+(\.\d+)?\s?ml\b(?!.*nicotine)/, /\be-?liquid capacity[:\s]+\d+(\.\d+)?\s?ml\b/]);

  const nicotine_strength = firstMatch(lower, [/\b\d{1,2}(\.\d+)?\s?mg\/?ml?\b/, /\b\d{1,2}(\.\d+)?\s?%\s?nic(otine)?\b/, /\bnicotine[:\s]+\d{1,2}(\.\d+)?\s?(mg|%)\b/]);

  const pod_type = firstMatch(lower, [/\bpod\s?(system|kit)?\b/]);

  let prefilled_or_refillable: PrefilledOrRefillable | null = null;
  const hasPrefilled = /\bprefilled\b|\bpre-filled\b/.test(lower);
  const hasRefillable = /\brefillable\b/.test(lower);
  if (hasPrefilled && hasRefillable) prefilled_or_refillable = "both";
  else if (hasPrefilled) prefilled_or_refillable = "prefilled";
  else if (hasRefillable) prefilled_or_refillable = "refillable";

  const flavour_count = firstNumber(lower, [/([\d,]+)\s*flavou?rs\b/]);

  const coil_type = COIL_TYPES.find((type) => lower.includes(type)) ?? null;

  const wattage = firstMatch(lower, [/\b\d{1,3}\s?w(att)?s?\b/]);

  const charging_type = CHARGING_TYPES.find((type) => lower.includes(type)) ?? null;

  return {
    device_type,
    puff_count,
    battery_capacity: battery_capacity?.toUpperCase().replace(/\s+/g, "") ?? null,
    liquid_capacity: liquid_capacity?.replace(/\s+/g, "") ?? null,
    nicotine_strength: nicotine_strength?.replace(/\s+/g, "") ?? null,
    pod_type,
    prefilled_or_refillable,
    flavour_count,
    coil_type,
    wattage: wattage?.replace(/\s+/g, "") ?? null,
    charging_type,
  };
}

export function hasAnySpec(specs: ExtractedSpecs): boolean {
  return Object.values(specs).some((value) => value !== null);
}
