# Vape Competitor Monitor

Internal competitor-intelligence platform for the SEO/ecommerce team: monitors up to 10
competitor vape sites' XML sitemaps, detects genuinely new product URLs, extracts what it can
from each product page, and turns every new discovery into a task for the team to work.

Built with Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui, and
Supabase (Postgres, Auth, RLS).

## How new-product detection works

The system never trusts a sitemap's `<lastmod>` as a publish date. The pipeline is:

```
Sitemap fetch → classify product URLs → normalize URLs → diff against the database
  → genuinely new URL found → fetch + extract product data → create task (status: To Do)
```

- **`first_seen_at`** — when this app's crawler first saw the URL. This is the field every
  "new today / this week" count is based on.
- **`source_last_modified_at`** — the sitemap's `<lastmod>`, kept only as supporting info.
- The very first scan of a competitor is a **baseline**: it saves every existing product URL
  without creating tasks, so adding a competitor with 4,000 products doesn't flood the team
  with 4,000 tasks. Only products discovered *after* the baseline create tasks (opt in to
  "import existing products as tasks" on the Add Competitor form if you want that instead).
- A product missing from a later scan is never deleted — it's flagged `missing_from_sitemap`,
  and only marked `possibly_removed` after 3 consecutive scans confirm it's gone.

See `supabase/migrations/` for the full schema and comments explaining each design choice, and
`src/lib/crawler/scan-competitor.ts` for the orchestration logic.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Install the Supabase CLI if you don't have it: `npm install -g supabase`.
3. From this project's root:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   This applies every migration in `supabase/migrations/` in order (extensions, tables, RLS
   policies, indexes, and the default task statuses).
4. In the Supabase dashboard, go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (server-only — never expose this to the browser)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from step 1:

```bash
cp .env.example .env.local
```

| Variable | Where it's used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients (RLS-respecting) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client used by the crawler — never imported client-side |
| `CRON_SECRET` | Bearer token the `/api/cron/scan` route requires |
| `NEXT_PUBLIC_APP_URL` | Base URL used when building links in notifications |
| `MAX_COMPETITORS` | Competitor slot limit shown/enforced in the UI (default 10) |

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The **first account you sign up** becomes
Super Admin automatically; everyone after that starts as Team Member (promote them from
Settings → Users & Roles).

## 4. Add a competitor and watch it work

From the Competitors page: add a name, website, and sitemap URL, then save — the baseline scan
kicks off immediately. After that, use **Scan Now** any time, or let the scheduler handle it
(see below).

## 5. Scheduled scanning in production

`GET /api/cron/scan` finds every active competitor whose `next_scan_at` has passed and scans
them independently (one competitor's failure never blocks the others), then each competitor
reschedules itself based on its own `scan_frequency_minutes`.

- **Vercel**: `vercel.json` already defines a cron hitting this route every 15 minutes. Set the
  `CRON_SECRET` env var in your Vercel project — Vercel automatically sends
  `Authorization: Bearer $CRON_SECRET` on requests it makes to cron-configured routes, which is
  exactly what the route checks. Vercel's Hobby plan limits cron jobs to once per day; on Hobby,
  point an external scheduler (GitHub Actions, cron-job.org, etc.) at the same URL/token instead.
- **Self-hosted**: point any scheduler (`node-cron`, a system cron job, GitHub Actions) at
  `GET https://your-domain/api/cron/scan` with the `Authorization: Bearer <CRON_SECRET>` header.

## 6. Playwright fallback (optional)

Most product pages are extracted via plain `fetch` + JSON-LD/OpenGraph/meta-tag parsing. For
pages that render client-side with no server HTML (rare, but it happens), the crawler falls
back to headless Chromium via Playwright — see `src/lib/crawler/playwright-fallback.ts`.

Playwright's browser binary doesn't fit Vercel's standard serverless functions well. This
fallback is written to fail soft (extraction just falls back to "failed" for that one product,
the rest of the scan is unaffected) when Playwright isn't available. To enable it for real:

- Self-hosted / Docker / a dedicated worker: `npx playwright install chromium` once, then it
  works automatically wherever the crawler runs.
- On Vercel: run the crawler on a separate always-on worker (a small Node service you control)
  instead of the serverless function, and have that worker call the same `scanCompetitor()`
  function — the crawler code is host-agnostic by design for exactly this reason.

## Architecture notes

- **Roles**: Super Admin, Manager, Team Member, Viewer — enforced by both Postgres RLS
  (`supabase/migrations/*_rls_policies.sql`) and a server-side `requireRole()` check in every
  Server Action (`src/lib/actions/`), so a bug in one layer doesn't leave the other exposed.
- **Task statuses are data, not code** — `task_statuses` is a table (seeded with To Do,
  Processing, Review, Added, Not Add, No Need, Error), so a manager can rename or add statuses
  from Settings without a deploy.
- **Products/specs/scans are crawler-owned** — RLS only grants users `SELECT` on those tables;
  every write goes through the service-role client, either from the scheduled crawl or from a
  user-triggered action (Scan Now, Re-scan product) that still runs the same crawler code.
- **10-competitor limit** is an app-level check (`MAX_COMPETITORS`), not a database constraint,
  so raising it later is a config change, not a migration.

## Commands

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint
```
