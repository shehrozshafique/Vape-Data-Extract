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
