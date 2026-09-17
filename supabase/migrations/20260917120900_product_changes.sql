-- product_changes: history of field-level changes detected on already-known products
-- (price, stock, title, description). Modular so new tracked fields need no schema change.
create table public.product_changes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  field_name text not null,
  previous_value text,
  new_value text,
  detected_at timestamptz not null default now(),
  sitemap_scan_id uuid references public.sitemap_scans(id) on delete set null
);
