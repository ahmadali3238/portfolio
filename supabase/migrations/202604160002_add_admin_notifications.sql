create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  severity text not null default 'info',
  read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

create index if not exists admin_notifications_read_idx
  on public.admin_notifications (read)
  where read = false;

alter table public.admin_notifications enable row level security;

drop policy if exists "Public read admin notifications" on public.admin_notifications;
create policy "Public read admin notifications"
on public.admin_notifications
for select
to public
using (true);
