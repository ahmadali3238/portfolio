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
