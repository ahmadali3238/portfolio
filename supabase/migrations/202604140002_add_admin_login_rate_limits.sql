create table if not exists public.admin_login_rate_limits (
  client_key text primary key,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc'::text, now()),
  blocked_until timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists admin_login_rate_limits_blocked_until_idx
on public.admin_login_rate_limits (blocked_until);

create or replace function public.set_admin_login_rate_limit_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_admin_login_rate_limit_updated_at
on public.admin_login_rate_limits;

create trigger set_admin_login_rate_limit_updated_at
before update on public.admin_login_rate_limits
for each row
execute function public.set_admin_login_rate_limit_updated_at();

alter table public.admin_login_rate_limits enable row level security;
