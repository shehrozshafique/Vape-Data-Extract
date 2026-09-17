import { createClient } from "@/lib/supabase/server";

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string | null; email: string } | null;
}

export async function getAuditLog(limit = 50): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_id, created_at, profiles(name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const record = row as unknown as { id: string; action: string; entity_type: string; entity_id: string | null; created_at: string; profiles: { name: string | null; email: string } | null };
    return { id: record.id, action: record.action, entityType: record.entity_type, entityId: record.entity_id, createdAt: record.created_at, user: record.profiles };
  });
}
