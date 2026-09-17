-- sitemap_scans: one row per crawl run per competitor. This is the scan history log.
create table public.sitemap_scans (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('pending', 'running', 'success', 'partial_error', 'failed')),
  is_baseline boolean not null default false,
  total_urls int not null default 0,
  new_urls int not null default 0,
  existing_urls int not null default 0,
  missing_urls int not null default 0,
  error_count int not null default 0,
  error_message text,
  sitemap_hash text,
  http_status int,
  duration_ms int,
  triggered_by text not null default 'schedule' check (triggered_by in ('schedule', 'manual', 'initial')),
  triggered_by_user uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
