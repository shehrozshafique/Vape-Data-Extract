import { NextResponse } from "next/server";
import { runScheduledScans } from "@/lib/crawler/run-scheduled-scans";

// Allow enough time to work through up to 10 competitors sequentially-ish (Promise.allSettled
// still runs them concurrently, but individual page fetches can be slow on flaky sites).
export const maxDuration = 300;

/**
 * Triggered by Vercel Cron (or any external scheduler pointed at this URL with the same
 * bearer token). Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on requests
 * it makes to cron-configured routes when CRON_SECRET is set as an env var.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledScans();
  return NextResponse.json(result);
}
