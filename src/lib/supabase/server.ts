import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_DISABLED } from "@/lib/constants";
import { createAdminClient } from "./admin";
import type { Database } from "./database.types";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads/writes the auth cookie via Next's cookie store. In a Server Component the
 * `setAll` write will throw (cookies are read-only there) — that's expected and safe to
 * ignore because the proxy (middleware) already refreshes the session on every request.
 *
 * When AUTH_DISABLED, returns the service-role client so RLS doesn't block local browsing.
 */
export async function createClient() {
  if (AUTH_DISABLED) {
    return createAdminClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Project Settings → Environment Variables.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignore, proxy.ts handles session refresh.
        }
      },
    },
  });
}
