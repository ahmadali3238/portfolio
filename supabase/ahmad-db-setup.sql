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
-- Outreach engine: state-machine pipeline for automated client outreach.
-- Mirrors the blog system conventions (uuid PKs, utc timestamps, RLS, updated_at triggers).
-- Read path is the admin dashboard (service-role only); no public read policies here.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Leads: one row per discovered prospect, walked through the pipeline status.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_leads (
  id uuid primary key default gen_random_uuid(),

  -- identity
  company_name text not null,
  person_name text,
  person_title text,
  domain text,
  linkedin_url text,

  -- segment: which playbook this lead belongs to
  --   hiring_signal = actively posted a role we match (warm, "I saw you're hiring")
  --   prospect      = not hiring, but likely needs the service ("I can build X for you")
  segment text not null default 'hiring_signal',

  -- geography (drives prioritization — we chase high-budget buyer markets)
  country text,                                 -- ISO-ish country name, inferred or enriched
  geo_tier int,                                 -- 1 (US/UAE/UK/EU…) | 2 | 3 (deprioritized)
  geo_score int not null default 0,             -- contribution of geo to the overall score

  -- provenance / signal
  source text not null,                         -- hn | remoteok | wwr | yc | producthunt | osm | manual
  source_url text,
  signal text,                                  -- human-readable "why this lead" (role + stack)
  signal_raw jsonb default '{}'::jsonb,         -- raw posting payload from the source
  score int not null default 0,                 -- 0-100 overall relevance (stack + geo + segment + recency)

  -- enrichment (BetterContact)
  email text,
  email_status text,                            -- verified | catch_all | risky | not_found
  phone text,
  enrichment_raw jsonb default '{}'::jsonb,

  -- pipeline
  -- sourced | enriching | enriched | enrich_failed | drafting | drafted
  -- | approved | sending | sent | send_failed | replied | bounced | skipped
  status text not null default 'sourced',
  status_reason text,
  dedupe_key text not null,                     -- normalized company(+person) for idempotency

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists outreach_leads_dedupe_key_idx on public.outreach_leads (dedupe_key);
create index if not exists outreach_leads_status_idx on public.outreach_leads (status);
create index if not exists outreach_leads_source_idx on public.outreach_leads (source);
create index if not exists outreach_leads_score_idx on public.outreach_leads (score desc);
create index if not exists outreach_leads_created_at_idx on public.outreach_leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Messages: the initial email + each follow-up generated for a lead.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.outreach_leads (id) on delete cascade,

  kind text not null default 'initial',         -- initial | followup
  sequence int not null default 0,              -- 0 = initial, 1 = first follow-up, ...
  subject text not null,
  body text not null,

  channel text not null default 'email',
  status text not null default 'draft',         -- draft | approved | sending | sent | failed | skipped
  send_mode text,                               -- draft | smtp | export
  compose_url text,                             -- gmail compose deeplink (draft mode)
  provider_message_id text,
  error text,
  ai_meta jsonb default '{}'::jsonb,            -- model, token usage, rationale

  scheduled_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,

  -- delivery / engagement tracking (all free, first-party where possible)
  tracking_token text,                          -- opaque token used in tracked links / optional pixel
  delivered_at timestamptz,                     -- sent OK + no bounce seen via IMAP
  bounced_at timestamptz,                       -- bounce detected via IMAP (mailer-daemon)
  first_clicked_at timestamptz,                 -- first link click / landing-page visit (first-party)
  click_count int not null default 0,
  first_opened_at timestamptz,                  -- OPTIONAL pixel open (off by default; unreliable)
  open_count int not null default 0,
  replied_at timestamptz,                       -- reply matched via IMAP

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists outreach_messages_tracking_token_idx on public.outreach_messages (tracking_token);
create index if not exists outreach_messages_lead_id_idx on public.outreach_messages (lead_id);
create index if not exists outreach_messages_status_idx on public.outreach_messages (status);
create index if not exists outreach_messages_scheduled_at_idx on public.outreach_messages (scheduled_at);
create index if not exists outreach_messages_created_at_idx on public.outreach_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Replies: inbound responses classified by Claude (Reply-Intelligence style).
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_replies (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.outreach_leads (id) on delete cascade,

  raw_text text not null,
  -- interested | meeting_request | question | objection | not_now | referral
  -- | not_interested | auto_reply | unsubscribe | spam | other
  classification text,
  sentiment text,                               -- positive | neutral | negative
  confidence numeric,
  suggested_followup text,                      -- Claude-drafted reply, pending human review
  handled boolean not null default false,
  classification_raw jsonb default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists outreach_replies_lead_id_idx on public.outreach_replies (lead_id);
create index if not exists outreach_replies_classification_idx on public.outreach_replies (classification);
create index if not exists outreach_replies_created_at_idx on public.outreach_replies (created_at desc);

-- ---------------------------------------------------------------------------
-- Engagement: granular per-message event log (delivered/clicked/opened/replied)
-- powering the conversation timeline + "who received/opened/replied" view.
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_engagement (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.outreach_messages (id) on delete cascade,
  lead_id uuid references public.outreach_leads (id) on delete cascade,
  event text not null,                          -- delivered | bounced | clicked | visited | opened | replied
  target text,                                  -- which link was clicked (portfolio | booking | landing | resume)
  user_agent text,
  ip_hash text,                                 -- hashed, privacy-safe
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists outreach_engagement_message_id_idx on public.outreach_engagement (message_id);
create index if not exists outreach_engagement_lead_id_idx on public.outreach_engagement (lead_id);
create index if not exists outreach_engagement_event_idx on public.outreach_engagement (event);
create index if not exists outreach_engagement_created_at_idx on public.outreach_engagement (created_at desc);

-- ---------------------------------------------------------------------------
-- Events: pipeline run log (sourcing / enrich / draft / send batches).
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  stage text not null,                          -- source | enrich | draft | send | followup | classify
  status text not null,                         -- success | partial | failed | skipped
  processed int not null default 0,
  succeeded int not null default 0,
  failed int not null default 0,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists outreach_events_stage_idx on public.outreach_events (stage);
create index if not exists outreach_events_created_at_idx on public.outreach_events (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_outreach_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_outreach_leads_updated_at on public.outreach_leads;
create trigger set_outreach_leads_updated_at
before update on public.outreach_leads
for each row execute function public.set_outreach_updated_at();

drop trigger if exists set_outreach_messages_updated_at on public.outreach_messages;
create trigger set_outreach_messages_updated_at
before update on public.outreach_messages
for each row execute function public.set_outreach_updated_at();

drop trigger if exists set_outreach_replies_updated_at on public.outreach_replies;
create trigger set_outreach_replies_updated_at
before update on public.outreach_replies
for each row execute function public.set_outreach_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: lock everything down. Only the service-role key (admin + scripts) reads.
-- No public policies are created, so anon/auth roles get nothing.
-- ---------------------------------------------------------------------------
alter table public.outreach_leads enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_replies enable row level security;
alter table public.outreach_engagement enable row level security;
alter table public.outreach_events enable row level security;
-- Per-source pagination cursors so nightly runs mine deeper into each source
-- (HN thread comments, YC directory) instead of re-reading the top every night.
-- Pattern borrowed from de-reply-classifier's category_scrape_state.

create table if not exists public.outreach_source_state (
  source text primary key,
  cursor jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.outreach_source_state enable row level security;
-- service-role only (no public policies), same as the other outreach tables
