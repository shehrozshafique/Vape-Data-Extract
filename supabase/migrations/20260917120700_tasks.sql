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
