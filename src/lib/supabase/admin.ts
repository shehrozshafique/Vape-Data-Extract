import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses Row Level Security entirely — this is what the crawler and
 * cron routes use to write competitors/products/tasks on the system's behalf.
 *
 * NEVER import this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * The `server-only` import above makes any accidental client-side import fail at build time.
 */
/** Public project URL — safe to fall back when NEXT_PUBLIC_* was empty-baked at build. */
const FALLBACK_SUPABASE_URL = "https://vstpbybpnrpbtcjeqnjo.supabase.co";

export function createAdminClient() {
  // Prefer server-only SUPABASE_URL so the value is not baked empty at build time.
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in Vercel Project Settings → Environment Variables, then redeploy.",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
