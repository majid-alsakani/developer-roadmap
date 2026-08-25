-- Developer Roadmaps by Majid Al-Sakani
-- Run this migration in the Supabase SQL editor or CLI.
-- The browser must use only the publishable key; never expose service_role.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_slug text not null check (roadmap_slug ~ '^[a-z0-9-]+$'),
  node_id text not null,
  status text not null check (status in ('learning', 'done', 'skip')),
  updated_at timestamptz not null default now(),
  primary key (user_id, roadmap_slug, node_id)
);

create table if not exists public.quiz_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_slug text not null check (roadmap_slug ~ '^[a-z0-9-]+$'),
  node_id text not null,
  best_score integer not null default 0 check (best_score between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  passed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, roadmap_slug, node_id)
);

create index if not exists progress_user_roadmap_idx on public.progress(user_id, roadmap_slug);
create index if not exists quiz_results_user_roadmap_idx on public.quiz_results(user_id, roadmap_slug);

create or replace function public.keep_progress_monotonic()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'done' and new.status <> 'done' then
      new.status := 'done';
    end if;
    if old.status = 'done' then
      new.updated_at := greatest(old.updated_at, new.updated_at);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists progress_monotonic_trigger on public.progress;
create trigger progress_monotonic_trigger
before update on public.progress
for each row execute function public.keep_progress_monotonic();

create or replace function public.keep_quiz_best()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.best_score := greatest(old.best_score, new.best_score);
    new.attempts := greatest(old.attempts, new.attempts);
    new.passed := old.passed or new.passed or new.best_score >= 70;
    new.updated_at := greatest(old.updated_at, new.updated_at);
  else
    new.passed := new.passed or new.best_score >= 70;
  end if;
  return new;
end;
$$;

drop trigger if exists quiz_best_trigger on public.quiz_results;
create trigger quiz_best_trigger
before insert or update on public.quiz_results
for each row execute function public.keep_quiz_best();

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_results enable row level security;

revoke all on table public.profiles, public.progress, public.quiz_results from anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.progress, public.quiz_results to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists progress_select_own on public.progress;
create policy progress_select_own on public.progress for select to authenticated using (auth.uid() = user_id);
drop policy if exists progress_insert_own on public.progress;
create policy progress_insert_own on public.progress for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists progress_update_own on public.progress;
create policy progress_update_own on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists progress_delete_own on public.progress;
create policy progress_delete_own on public.progress for delete to authenticated using (auth.uid() = user_id);

drop policy if exists quiz_results_select_own on public.quiz_results;
create policy quiz_results_select_own on public.quiz_results for select to authenticated using (auth.uid() = user_id);
drop policy if exists quiz_results_insert_own on public.quiz_results;
create policy quiz_results_insert_own on public.quiz_results for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists quiz_results_update_own on public.quiz_results;
create policy quiz_results_update_own on public.quiz_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists quiz_results_delete_own on public.quiz_results;
create policy quiz_results_delete_own on public.quiz_results for delete to authenticated using (auth.uid() = user_id);
