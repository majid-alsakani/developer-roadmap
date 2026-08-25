-- Advanced learning activity for Developer Roadmaps by Majid Al-Sakani.
-- Run after 202608250001_learning_progress.sql.
-- No service_role key is required by the browser.

create table if not exists public.learning_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_slug text not null check (roadmap_slug ~ '^[a-z0-9-]+$'),
  node_id text,
  event_type text not null check (event_type in ('progress_saved', 'quiz_saved', 'sync_completed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_events_user_created_idx on public.learning_events(user_id, created_at desc);
create index if not exists learning_events_user_roadmap_idx on public.learning_events(user_id, roadmap_slug, created_at desc);

alter table public.learning_events enable row level security;
revoke all on table public.learning_events from anon, authenticated;
grant select, insert on table public.learning_events to authenticated;
grant usage, select on sequence public.learning_events_id_seq to authenticated;

drop policy if exists learning_events_select_own on public.learning_events;
create policy learning_events_select_own on public.learning_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists learning_events_insert_own on public.learning_events;
create policy learning_events_insert_own on public.learning_events
  for insert to authenticated with check (auth.uid() = user_id);
