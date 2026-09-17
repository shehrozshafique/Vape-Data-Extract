-- product_specs: vape-specific attributes, kept separate from products so the core
-- product model stays generic and this table can grow independently.
create table public.product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,

  device_type text,
  puff_count int,
  battery_capacity text,
  liquid_capacity text,
  nicotine_strength text,
  pod_type text,
  prefilled_or_refillable text check (prefilled_or_refillable in ('prefilled', 'refillable', 'both')),
  flavour_count int,
  coil_type text,
  wattage text,
  charging_type text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger product_specs_set_updated_at
  before update on public.product_specs
  for each row execute function public.set_updated_at();
