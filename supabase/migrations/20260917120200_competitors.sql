-- competitors: the list of vape sites we monitor. Admin-managed through the UI, never hard-coded.
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  website_url text not null unique,
  logo_url text,
  sitemap_url text not null,
  product_sitemap_url text,
  -- 'auto' lets the crawler figure out whether the URL is a plain urlset or a sitemap index.
  sitemap_type text not null default 'auto' check (sitemap_type in ('auto', 'urlset', 'sitemap_index')),
  include_patterns text[] not null default '{}',
  exclude_patterns text[] not null default '{}',
  -- Optional CSS-selector overrides for product-page extraction (title/price/image/brand/
  -- availability/sku). Generic extraction (JSON-LD -> OpenGraph -> meta tags -> heuristics)
  -- runs first; these selectors are only consulted when generic extraction comes up empty.
  extractor_config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused')),
  scan_frequency_minutes int not null default 180 check (scan_frequency_minutes > 0),
  last_scan_at timestamptz,
  next_scan_at timestamptz,
  last_sitemap_hash text,
  -- baseline_completed_at is set once the first scan has finished. Until then the crawler is
  -- establishing the starting inventory and must not spam the team with historical products.
  baseline_completed_at timestamptz,
  baseline_import_as_tasks boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger competitors_set_updated_at
  before update on public.competitors
  for each row execute function public.set_updated_at();
