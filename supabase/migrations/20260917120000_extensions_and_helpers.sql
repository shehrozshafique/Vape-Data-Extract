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
