import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_DISABLED } from "@/lib/constants";
import type { Database } from "@/lib/supabase/database.types";

/** Writes one audit_log row. Call with the caller's own authenticated client so `user_id`
 * naturally satisfies the audit_log_insert_self RLS policy. */
export async function logAudit(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  // Fake local-dev profile is not in profiles — skip audit while auth is bypassed.
  if (AUTH_DISABLED) return;

  await supabase.from("audit_log").insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
  });
}
