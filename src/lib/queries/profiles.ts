import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("name", { ascending: true });
  return data ?? [];
}
