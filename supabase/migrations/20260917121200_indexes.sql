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
