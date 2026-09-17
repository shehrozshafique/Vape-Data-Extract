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
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
