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
