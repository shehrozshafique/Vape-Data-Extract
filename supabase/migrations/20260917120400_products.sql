-- products: every product URL ever discovered for a competitor, deduplicated by normalized URL.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,

  name text,
  brand text,
  product_url text not null,
  -- normalized_url is what duplicate protection keys off (query params stripped, trailing
  -- slash / protocol normalized). Never treat two different normalized_urls as the same product.
  normalized_url text not null,
  canonical_url text,
  image_url text,

  price numeric(10, 2),
  sale_price numeric(10, 2),
  currency text not null default 'GBP',
  availability text not null default 'unknown' check (availability in ('in_stock', 'out_of_stock', 'preorder', 'discontinued', 'unknown')),
  sku text,
  description text,
  meta_title text,
  meta_description text,

  -- Where this URL was found. Kept open-ended (not an enum) so future sources
  -- (collection crawler, API, RSS, manual entry) don't need a schema migration.
  discovery_source text not null default 'sitemap',
  sitemap_url text,

  -- Date bookkeeping: keep these conceptually distinct, see product-detection rules in the app.
  -- source_last_modified_at is the sitemap's <lastmod> — supporting info only, never the
  -- signal used to decide "new". published_at is only set if a page genuinely exposes it.
  source_last_modified_at timestamptz,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  -- true when this product was part of a competitor's initial baseline scan (no task created).
  is_baseline boolean not null default false,

  -- Removal handling: a product missing from the sitemap is never deleted outright.
  missing_from_sitemap boolean not null default false,
  first_missing_at timestamptz,
  missing_scan_count int not null default 0,
  possibly_removed boolean not null default false,

  content_hash text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending', 'success', 'partial', 'failed', 'skipped')),
  extraction_error text,
  last_extracted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_competitor_normalized_url_key unique (competitor_id, normalized_url)
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();
