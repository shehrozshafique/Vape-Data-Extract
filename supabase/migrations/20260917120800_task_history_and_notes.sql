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
