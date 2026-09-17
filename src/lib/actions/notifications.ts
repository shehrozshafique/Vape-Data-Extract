"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { ActionResult } from "./competitors";

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not signed in" };
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .or(`user_id.eq.${profile.id},user_id.is.null`)
      .eq("read", false);
    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error" };
  }
}
