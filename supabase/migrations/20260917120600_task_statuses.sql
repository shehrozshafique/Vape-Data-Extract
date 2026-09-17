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
