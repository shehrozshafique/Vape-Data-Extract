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
