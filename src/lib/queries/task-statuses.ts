import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type TaskStatus = Database["public"]["Tables"]["task_statuses"]["Row"];

export async function getTaskStatuses(): Promise<TaskStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("task_statuses").select("*").order("sort_order", { ascending: true });
  return data ?? [];
}
