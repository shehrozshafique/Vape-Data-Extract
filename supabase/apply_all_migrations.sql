-- ===== 20260917120000_extensions_and_helpers.sql =====
-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Generic updated_at trigger function, reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ===== 20260917120100_profiles.sql =====
-- profiles: one row per auth.users, carries app role + display info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  role text not null default 'team_member' check (role in ('super_admin', 'manager', 'team_member', 'viewer')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile whenever a new auth user signs up.
-- The very first user in the system is made super_admin so someone can bootstrap access;
-- everyone after that defaults to team_member and is promoted manually by an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
  assigned_role text;
begin
  select count(*) into existing_count from public.profiles;
  assigned_role := case when existing_count = 0 then 'super_admin' else 'team_member' end;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    assigned_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a user from escalating their own role through a direct table update;
-- role changes must go through the service-role client (server action that checks the caller is super_admin).
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'Role changes must be performed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Security-definer helpers used throughout RLS policies. They read profiles directly,
-- bypassing profiles' own RLS, which avoids infinite recursion when profiles policies call them.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('super_admin', 'manager') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_team_member_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('super_admin', 'manager', 'team_member') from public.profiles where id = auth.uid()), false);
$$;


-- ===== 20260917120200_competitors.sql =====
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


-- ===== 20260917120300_sitemap_scans.sql =====
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


-- ===== 20260917120400_products.sql =====
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


-- ===== 20260917120500_product_specs.sql =====
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


-- ===== 20260917120600_task_statuses.sql =====
-- task_statuses: configurable workflow statuses (admins can rename or add to these later,
-- so this is a table rather than a Postgres enum).
create table public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  -- Tailwind-ish color token consumed by the status badge component, e.g. 'blue', 'amber'.
  color text not null,
  description text,
  sort_order int not null default 0,
  is_default boolean not null default false,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger task_statuses_set_updated_at
  before update on public.task_statuses
  for each row execute function public.set_updated_at();

-- Only one status may be the default assigned to newly created tasks.
create unique index task_statuses_single_default
  on public.task_statuses ((true))
  where is_default;


-- ===== 20260917120700_tasks.sql =====
-- tasks: exactly one workflow task per discovered (non-baseline) product.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  status_id uuid not null references public.task_statuses(id),
  assigned_to uuid references public.profiles(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();


-- ===== 20260917120800_task_history_and_notes.sql =====
-- task_history: immutable audit trail of every status change on a task.
create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  old_status_id uuid references public.task_statuses(id),
  new_status_id uuid not null references public.task_statuses(id),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  note text
);

-- task_notes: free-form, timestamped, attributed notes left by the team on a task.
create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);


-- ===== 20260917120900_product_changes.sql =====
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


-- ===== 20260917121000_notifications.sql =====
-- notifications: internal notification center. user_id null means a broadcast to every user.
-- 'channel' is prepared for future Slack/email/WhatsApp delivery without a schema change;
-- only 'in_app' is actually delivered today.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_products', 'scan_failed', 'sitemap_changed', 'product_unavailable', 'status_changed', 'system')),
  channel text not null default 'in_app' check (channel in ('in_app', 'slack', 'email', 'whatsapp')),
  title text not null,
  message text not null,
  link text,
  competitor_id uuid references public.competitors(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);


-- ===== 20260917121100_audit_log.sql =====
-- audit_log: who did what to which object, for accountability across the whole app.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);


-- ===== 20260917121200_indexes.sql =====
-- Indexes chosen for the app's actual query patterns: dashboard KPI counts by date,
-- the tasks table's filters/sort, competitor activity rollups, and product search.

-- competitors
create index competitors_status_idx on public.competitors (status);
create index competitors_next_scan_at_idx on public.competitors (next_scan_at) where status = 'active';

-- sitemap_scans
create index sitemap_scans_competitor_started_idx on public.sitemap_scans (competitor_id, started_at desc);

-- Prevents duplicate concurrent scans for the same competitor (e.g. from rapid "Scan Now"
-- clicks or an overlapping cron tick) at the database level, not just in application code.
create unique index sitemap_scans_one_active_per_competitor
  on public.sitemap_scans (competitor_id)
  where status in ('pending', 'running');

-- products
create index products_competitor_id_idx on public.products (competitor_id);
create index products_first_seen_at_idx on public.products (first_seen_at desc);
create index products_last_seen_at_idx on public.products (last_seen_at desc);
create index products_brand_idx on public.products (brand);
create index products_missing_idx on public.products (missing_from_sitemap) where missing_from_sitemap;
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index products_brand_trgm_idx on public.products using gin (brand gin_trgm_ops);
create index products_url_trgm_idx on public.products using gin (product_url gin_trgm_ops);

-- tasks
create index tasks_status_id_idx on public.tasks (status_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_created_at_idx on public.tasks (created_at desc);

-- task_history / task_notes
create index task_history_task_id_idx on public.task_history (task_id, changed_at desc);
create index task_notes_task_id_idx on public.task_notes (task_id, created_at desc);

-- product_changes
create index product_changes_product_id_idx on public.product_changes (product_id, detected_at desc);

-- notifications
create index notifications_user_unread_idx on public.notifications (user_id, read, created_at desc);

-- audit_log
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);


-- ===== 20260917121300_rls_policies.sql =====
-- Row Level Security. Overall model:
--   viewer         : read everything, write nothing.
--   team_member    : read everything, work tasks (status/notes/assignment), leave notes.
--   manager        : team_member + manage competitors, statuses, users' roles excluded.
--   super_admin    : everything, including role changes.
-- The crawler (sitemap scans, product/spec writes, auto-created tasks, system notifications)
-- always runs with the service-role key from server-only code, which bypasses RLS entirely.
-- Policies below therefore only need to describe what authenticated *users* may do.

alter table public.profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.sitemap_scans enable row level security;
alter table public.products enable row level security;
alter table public.product_specs enable row level security;
alter table public.task_statuses enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.task_notes enable row level security;
alter table public.product_changes enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
-- Role escalation is blocked separately by the profiles_guard_role trigger.

-- competitors
create policy competitors_select_all on public.competitors
  for select to authenticated using (true);

create policy competitors_write_managers on public.competitors
  for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- sitemap_scans: read-only for users, written exclusively by the crawler (service role).
create policy sitemap_scans_select_all on public.sitemap_scans
  for select to authenticated using (true);

-- products: read-only for users, written exclusively by the crawler (service role).
create policy products_select_all on public.products
  for select to authenticated using (true);

-- product_specs: read-only for users, written exclusively by the crawler (service role).
create policy product_specs_select_all on public.product_specs
  for select to authenticated using (true);

-- task_statuses
create policy task_statuses_select_all on public.task_statuses
  for select to authenticated using (true);

create policy task_statuses_write_managers on public.task_statuses
  for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- tasks: everyone reads; team_member and above can update the workflow fields.
-- Row creation is done by the crawler (service role) alongside the product it belongs to.
create policy tasks_select_all on public.tasks
  for select to authenticated using (true);

create policy tasks_update_team on public.tasks
  for update to authenticated
  using (public.is_team_member_or_above())
  with check (public.is_team_member_or_above());

create policy tasks_delete_admin on public.tasks
  for delete to authenticated using (public.is_super_admin());

-- task_history: everyone reads; a user may only log a history row attributed to themselves.
create policy task_history_select_all on public.task_history
  for select to authenticated using (true);

create policy task_history_insert_self on public.task_history
  for insert to authenticated
  with check (public.is_team_member_or_above() and changed_by = auth.uid());

-- task_notes: everyone reads; a user may only author notes attributed to themselves.
create policy task_notes_select_all on public.task_notes
  for select to authenticated using (true);

create policy task_notes_insert_self on public.task_notes
  for insert to authenticated
  with check (public.is_team_member_or_above() and author_id = auth.uid());

-- product_changes: read-only for users, written exclusively by the crawler (service role).
create policy product_changes_select_all on public.product_changes
  for select to authenticated using (true);

-- notifications: a user sees their own notifications plus broadcasts (user_id is null).
-- Broadcasts have no per-viewer read-state (this is a small internal team tool, not a
-- multi-tenant one) — marking one read marks it read for the whole team, same as the rest of
-- the row's data. `user_id = auth.uid()` alone would never match a broadcast row (NULL is
-- never equal to anything), so it's explicitly included here too.
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid() or user_id is null);

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- audit_log: managers and above can review it; any authenticated user may write an entry
-- for their own actions (system-triggered entries go through the service role).
create policy audit_log_select_managers on public.audit_log
  for select to authenticated using (public.is_manager_or_above());

create policy audit_log_insert_self on public.audit_log
  for insert to authenticated with check (user_id = auth.uid());


-- ===== 20260917121400_seed_task_statuses.sql =====
-- Default workflow statuses. Admins can rename these or add new ones later from Settings.
insert into public.task_statuses (key, label, color, description, sort_order, is_default, is_terminal) values
  ('to_do',      'To-do',      'blue',   'New product waiting to be picked up.',                 10, true,  false),
  ('pending',    'Pending',    'purple', 'Queued / waiting on more information.',               20, false, false),
  ('processing', 'Processing', 'amber',  'Team is currently working on the product.',           30, false, false),
  ('done',       'Done',       'green',  'Work finished — product handled.',                    40, false, true),
  ('not_need',   'Not Need',   'gray',   'Product is irrelevant or not needed.',                50, false, true);


-- ===== 20260917121500_projects_and_permissions.sql =====
-- Projects = client websites. Competitors belong to a project; dashboard scopes by project.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text not null,
  domain text not null,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Backfill: one default project so existing competitors remain valid.
insert into public.projects (id, name, website_url, domain, notes)
values (
  '00000000-0000-4000-8000-000000000010',
  'Default',
  'https://example.com',
  'example.com',
  'Auto-created project for existing competitors. Rename or replace as needed.'
);

alter table public.competitors
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

update public.competitors
set project_id = '00000000-0000-4000-8000-000000000010'
where project_id is null;

alter table public.competitors
  alter column project_id set not null;

create index if not exists competitors_project_id_idx on public.competitors(project_id);

-- Per-user workflow flags + which projects they can access.
create table public.user_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_scan boolean not null default true,
  can_edit_tasks boolean not null default true,
  can_manage_competitors boolean not null default false,
  can_export boolean not null default true,
  can_manage_users boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger user_permissions_set_updated_at
  before update on public.user_permissions
  for each row execute function public.set_updated_at();

create table public.user_project_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists user_project_access_project_id_idx on public.user_project_access(project_id);

-- RLS
alter table public.projects enable row level security;
alter table public.user_permissions enable row level security;
alter table public.user_project_access enable row level security;

create policy projects_select_all on public.projects
  for select to authenticated using (true);

create policy projects_write_managers on public.projects
  for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

create policy user_permissions_select_all on public.user_permissions
  for select to authenticated using (true);

create policy user_permissions_write_admins on public.user_permissions
  for all to authenticated
  using (public.is_super_admin() or public.is_manager_or_above())
  with check (public.is_super_admin() or public.is_manager_or_above());

create policy user_project_access_select_all on public.user_project_access
  for select to authenticated using (true);

create policy user_project_access_write_admins on public.user_project_access
  for all to authenticated
  using (public.is_super_admin() or public.is_manager_or_above())
  with check (public.is_super_admin() or public.is_manager_or_above());

