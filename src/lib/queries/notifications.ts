import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export async function getNotifications(limit = 20): Promise<Notification[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("getNotifications:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("getNotifications failed:", err);
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    if (error) {
      console.error("getUnreadNotificationCount:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("getUnreadNotificationCount failed:", err);
    return 0;
  }
}
