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
