-- Allow team members (and above) to delete products so task cleanup can cascade.
-- Products were previously read-only for authenticated users (crawler uses service role).

create policy products_delete_team on public.products
  for delete to authenticated
  using (public.is_team_member_or_above());
