-- Recreate NHL Stats Master Supabase tables
-- Run in: Supabase Dashboard → SQL Editor (project bpjsvmcfqpcmmdgilxzu)
-- Safe to re-run: uses IF NOT EXISTS.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. nhl_player_seasons — the full NHL player-season dataset (~46,704 rows)
--    Reload data afterwards with: node scripts/load-to-supabase.mjs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.nhl_player_seasons (
  id              bigint generated always as identity primary key,
  player_id       integer not null,
  first_name      text    not null,
  last_name       text    not null,
  season_id       integer not null,
  position_code   text,
  team_abbrevs    text,
  team_names      text,
  games_played    integer,
  goals           integer,
  assists         integer,
  points          integer,
  penalty_minutes integer,
  active_player   boolean default false,
  rookie_flag     boolean default false,
  -- Derived from season_id (e.g. 20232024 → "2020s"); kept as a stored column
  -- so it can be filtered/indexed. Matches getEra() in lib/data/database.ts.
  era text generated always as ((((season_id / 10000) / 10 * 10)::text) || 's') stored
);

-- Indexes for the query patterns in lib/data/database.ts
create index if not exists idx_nps_points     on public.nhl_player_seasons (points);
create index if not exists idx_nps_era        on public.nhl_player_seasons (era);
create index if not exists idx_nps_player_id  on public.nhl_player_seasons (player_id);
create index if not exists idx_nps_rookie     on public.nhl_player_seasons (rookie_flag);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. nhl_stats_master_daily_challenge_scores — one row per user per day
--    Written/read by app/actions/daily-challenge-actions.ts
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.nhl_stats_master_daily_challenge_scores (
  id             bigint generated always as identity primary key,
  user_id        text not null,           -- Clerk user id
  challenge_date date not null,
  question_id    text not null,
  is_correct     boolean not null default false,
  answered_at    timestamptz not null default now(),
  -- upsert onConflict: 'user_id,challenge_date' relies on this unique constraint
  constraint uq_daily_user_date unique (user_id, challenge_date)
);

create index if not exists idx_daily_date    on public.nhl_stats_master_daily_challenge_scores (challenge_date);
create index if not exists idx_daily_correct on public.nhl_stats_master_daily_challenge_scores (is_correct);
