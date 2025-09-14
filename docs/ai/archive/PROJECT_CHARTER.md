# Euno's Jeopardy - Project Charter

> This charter captures the initial intent and high-level plan. For ongoing work and prioritization, use Linear as the source of truth.

## Project Overview
Online platform to create and host custom Jeopardy!-style games for friends. The app runs one game at a time: all connected non-host users are players in the current game (no in-app chat; players coordinate via Discord voice). The host adjudicates answers manually via UI controls. Players are currently unbounded (a later UI soft limit may apply). Hosts can prepare multiple clue sets in advance and load one when a game begins. Each clue set contains two boards (Jeopardy and Double Jeopardy: 6 categories × 5 clues with constrained Daily Double locations) plus a Final Jeopardy category and clue.

## Technical Architecture

### Frontend Stack
- Framework: React 19 with TypeScript
- Build Tool: Vite
- Styling: SCSS (component-scoped + global styles)
- UI Approach: Game-style interface with turns/states
- Component Organization: Feature-based folders

### Backend Strategy
- Approach: Client app with Supabase backend services
- Database: Supabase PostgreSQL with Row Level Security (RLS)
- Authentication: Supabase Auth (email/password; consider magic links)
- Real-time: Supabase Realtime channels for lobby/game/buzzer events
- API Integrations: None initially

### Data Management
- Data Sources: User-authored game content (boards, categories, clues)
- Processing: Simple validation and server-side checks where needed
- Storage: Relational schema in Supabase; row ownership + RLS
- Update Frequency: Real-time during games; on-demand for authoring

### Deployment & Hosting
- Platform: Vercel
- Deployment: Automatic from GitHub main branch
- Security: RLS policies, authenticated endpoints, input validation
- Backup: Supabase automatic backups

### Performance Considerations
- Scale: Small/medium sessions (up to ~20 concurrent players)
- Optimization: Batched updates, memoization, DB indexing, lean payloads

## Development Phases

### Phase 1: Foundation (MVP)
Goal: Play a full Jeopardy game with friends in a room hosted by one user.
- Create/join room (roles: Host, Player)
- Author game boards (categories, clues, values, answers)
- Realtime buzzer with host-controlled lock/unlock and first-to-buzz resolution
- Scoring: add/subtract values; support Daily Double wager; Final Jeopardy flow
- Persist games and results
- Basic polished UI per design images

### Phase 2: Social & Content
Goal: Make content sharing and discovery easy.
- Save/load multiple boards; import/export
- Share boards with links/permissions
- Simple content library and search

### Phase 3: Moderation & Polish
Goal: Improve quality and robustness.
- Host tools: adjudication helpers, timers, keyboard shortcuts
- Anti-cheat / fairness improvements; latency compensation
- Accessibility and mobile responsiveness

### Final Phase: Production Readiness
- Performance tuning, error handling, observability
- Security audit (RLS review, auth flows, input validation)
- Documentation and user guides

## Database Schema Sketch
(Subject to iteration; enforced by RLS.)

### Starter Entities and Relationships

- profiles — user profile linked to Supabase auth.users
- boards — template boards owned by host, per-round (jeopardy/double); includes Daily Double cell positions
- categories — per-board category headers (6)
- clues — per-board clue cells (5 per category) with value, text, answer
- clue_sets — aggregates two boards (JR/DJ) and Final Jeopardy (category, clue, answer)
- games — game session (host, selected clue_set, status/round, buzzer lock)
- players — game participants with score/nickname
- clue_states — per-game reveal state for each clue
- buzzes — who buzzed for a clue and when
- answers — player responses with host adjudication
- wagers — daily double & final jeopardy wagers (final wagers not tied to a clue)

Relationships
- profiles.id → boards.owner_id, clue_sets.owner_id, games.host_id, players.user_id, buzzes.user_id, answers.user_id, wagers.user_id
- boards.id → categories.board_id, clues.board_id, clue_sets.jr_board_id, clue_sets.dj_board_id
- clue_sets.id → games.clue_set_id
- games.id → players.game_id, clue_states.game_id, buzzes.game_id, answers.game_id, wagers.game_id
- clues.id → clue_states.clue_id, buzzes.clue_id, answers.clue_id, wagers.clue_id (nullable for final)

### Starter SQL (to evolve)

```sql
-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type game_status as enum ('lobby','in_progress','completed','archived');
create type round_type  as enum ('jeopardy','double','final');



-- Profiles (mirror of auth.users with app fields)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- Boards (templates; one per round)
create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  round round_type not null check (round in ('jeopardy','double')),
  daily_double_cells jsonb not null default '[]'::jsonb,
  -- Expect 1 DD for jeopardy, 2 for double; app may enforce, but keep a starter check:
  constraint dd_count_check check (
    (round = 'jeopardy' and jsonb_typeof(daily_double_cells)='array' and jsonb_array_length(daily_double_cells)=1)
    or (round = 'double' and jsonb_typeof(daily_double_cells)='array' and jsonb_array_length(daily_double_cells)=2)
  ),
  created_at timestamptz not null default now()
);

-- Categories (6 per board)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  title text not null,
  position int not null,
  unique (board_id, position)
);

-- Clues (5 per category)
create table if not exists clues (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  category_position int not null,
  row_index int not null, -- 1..5
  value int not null,
  text text not null,
  answer text not null,
  unique (board_id, category_position, row_index)
);

-- Clue Sets (JR + DJ + Final)
create table if not exists clue_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  jr_board_id uuid not null references boards(id) on delete restrict,
  dj_board_id uuid not null references boards(id) on delete restrict,
  final_category text not null,
  final_clue text not null,
  final_answer text not null,
  created_at timestamptz not null default now()
);

-- Games (one active at a time; history retained)
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  clue_set_id uuid not null references clue_sets(id) on delete restrict,
  status game_status not null default 'lobby',
  current_round round_type not null default 'jeopardy',
  is_buzzer_locked boolean not null default true,
  created_at timestamptz not null default now()
);

-- Players (game participants)
create table if not exists players (
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  nickname text,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- Clue reveal state per game
create table if not exists clue_states (
  game_id uuid not null references games(id) on delete cascade,
  clue_id uuid not null references clues(id) on delete cascade,
  revealed boolean not null default false,
  primary key (game_id, clue_id)
);

-- Buzzes
create table if not exists buzzes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  clue_id uuid not null references clues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, clue_id, user_id)
);

-- Answers (host-adjudicated)
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  clue_id uuid not null references clues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  response text not null,
  is_correct boolean,
  adjudicated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Wagers (DD & Final; clue_id nullable for Final)
create table if not exists wagers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  clue_id uuid references clues(id) on delete set null,
  user_id uuid not null references profiles(id) on delete cascade,
  amount int not null,
  created_at timestamptz not null default now()
);

-- Helper function: is the current user participating in a given game?
create or replace function is_game_participant(p_game_id uuid)
returns boolean language sql stable as $$
  select exists(select 1 from games g where g.id = p_game_id and g.host_id = auth.uid())
      or exists(select 1 from players p where p.game_id = p_game_id and p.user_id = auth.uid());
$$;

-- Enable RLS
alter table profiles    enable row level security;
alter table boards      enable row level security;
alter table categories  enable row level security;
alter table clues       enable row level security;
alter table clue_sets enable row level security;
alter table games       enable row level security;
alter table players     enable row level security;
alter table clue_states enable row level security;
alter table buzzes      enable row level security;
alter table answers     enable row level security;
alter table wagers      enable row level security;

-- Policies (starter)
-- Drop existing policies first (in case of re-runs)
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;

drop policy if exists "qs_owner_select" on clue_sets;
drop policy if exists "qs_owner_insert" on clue_sets;
drop policy if exists "qs_owner_update" on clue_sets;
drop policy if exists "qs_owner_delete" on clue_sets;

drop policy if exists "boards_owner_select" on boards;
drop policy if exists "boards_owner_write" on boards;
drop policy if exists "boards_select_game_participants" on boards;

drop policy if exists "categories_select_owner" on categories;
drop policy if exists "categories_insert_owner" on categories;
drop policy if exists "categories_select_game_participants" on categories;

drop policy if exists "clues_select_owner" on clues;
drop policy if exists "clues_insert_owner" on clues;
drop policy if exists "clues_select_game_participants" on clues;

drop policy if exists "games_select_participants" on games;
drop policy if exists "games_insert_host" on games;
drop policy if exists "games_update_host" on games;

drop policy if exists "players_select_participants" on players;
drop policy if exists "players_insert_self" on players;
drop policy if exists "players_update_self_or_host" on players;
drop policy if exists "players_delete_self_or_host" on players;

drop policy if exists "cluestates_select_participants" on clue_states;
drop policy if exists "cluestates_insert_host" on clue_states;
drop policy if exists "cluestates_update_host" on clue_states;

drop policy if exists "buzzes_select_participants" on buzzes;
drop policy if exists "buzzes_insert_participants" on buzzes;

drop policy if exists "answers_select_participants" on answers;
drop policy if exists "answers_insert_participants" on answers;
drop policy if exists "answers_update_host" on answers;

drop policy if exists "wagers_select_participants" on wagers;
drop policy if exists "wagers_insert_participants" on wagers;

-- Create policies
-- profiles: only owner can select/modify
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- clue_sets: owner CRUD
create policy "qs_owner_select" on clue_sets for select using (owner_id = auth.uid());
create policy "qs_owner_insert" on clue_sets for insert with check (owner_id = auth.uid());
create policy "qs_owner_update" on clue_sets for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "qs_owner_delete" on clue_sets for delete using (owner_id = auth.uid());

-- boards/categories/clues: owner can manage; participants in a game referencing the boards can select
create policy "boards_owner_select" on boards for select using (owner_id = auth.uid());
create policy "boards_owner_write" on boards for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "boards_select_game_participants" on boards for select using (
  exists(
    select 1 from clue_sets qs join games g on g.clue_set_id = qs.id
    where (boards.id = qs.jr_board_id or boards.id = qs.dj_board_id) and is_game_participant(g.id)
  )
);

create policy "categories_select_owner" on categories for select using (
  exists(select 1 from boards b where b.id = board_id and b.owner_id = auth.uid())
);
create policy "categories_insert_owner" on categories for insert with check (
  exists(select 1 from boards b where b.id = board_id and b.owner_id = auth.uid())
);
create policy "categories_select_game_participants" on categories for select using (
  exists(
    select 1 from boards b join clue_sets qs on (b.id = qs.jr_board_id or b.id = qs.dj_board_id)
    join games g on g.clue_set_id = qs.id
    where b.id = board_id and is_game_participant(g.id)
  )
);

create policy "clues_select_owner" on clues for select using (
  exists(select 1 from boards b where b.id = board_id and b.owner_id = auth.uid())
);
create policy "clues_insert_owner" on clues for insert with check (
  exists(select 1 from boards b where b.id = board_id and b.owner_id = auth.uid())
);
create policy "clues_select_game_participants" on clues for select using (
  exists(
    select 1 from boards b join clue_sets qs on (b.id = qs.jr_board_id or b.id = qs.dj_board_id)
    join games g on g.clue_set_id = qs.id
    where b.id = board_id and is_game_participant(g.id)
  )
);

-- games: host insert/update; participants select
create policy "games_select_participants" on games for select using (is_game_participant(id));
create policy "games_insert_host" on games for insert with check (host_id = auth.uid());
create policy "games_update_host" on games for update using (host_id = auth.uid()) with check (host_id = auth.uid());

-- players: participants select; self-join/leave; host manage
create policy "players_select_participants" on players for select using (is_game_participant(game_id));
create policy "players_insert_self" on players for insert with check (user_id = auth.uid());
create policy "players_update_self_or_host" on players for update using (
  user_id = auth.uid() or exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid())
) with check (
  user_id = auth.uid() or exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid())
);
create policy "players_delete_self_or_host" on players for delete using (
  user_id = auth.uid() or exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid())
);

-- clue_states: participants select; host write
create policy "cluestates_select_participants" on clue_states for select using (is_game_participant(game_id));
create policy "cluestates_insert_host" on clue_states for insert with check (exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid()));
create policy "cluestates_update_host" on clue_states for update using (exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid())) with check (true);

-- buzzes/answers/wagers: participants select; participants insert; host may update answers
create policy "buzzes_select_participants" on buzzes for select using (is_game_participant(game_id));
create policy "buzzes_insert_participants" on buzzes for insert with check (is_game_participant(game_id));

create policy "answers_select_participants" on answers for select using (is_game_participant(game_id));
create policy "answers_insert_participants" on answers for insert with check (is_game_participant(game_id));
create policy "answers_update_host" on answers for update using (exists(select 1 from games g where g.id = game_id and g.host_id = auth.uid())) with check (true);

create policy "wagers_select_participants" on wagers for select using (is_game_participant(game_id));
create policy "wagers_insert_participants" on wagers for insert with check (is_game_participant(game_id));
```




-- Enable RLS
alter table profiles    enable row level security;
alter table rooms       enable row level security;
alter table players     enable row level security;
alter table boards      enable row level security;
alter table categories  enable row level security;
alter table clues       enable row level security;
alter table buzzes      enable row level security;
alter table answers     enable row level security;
alter table wagers      enable row level security;

-- Basic starter policies (to refine later)
-- profiles: user can see/manage their own profile
create policy if not exists "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy if not exists "profiles_upsert_own" on profiles
  for insert with check (id = auth.uid());
create policy if not exists "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- rooms: host can insert/update; participants can select
create policy if not exists "rooms_select_participants" on rooms
  for select using (host_id = auth.uid() or exists(select 1 from players p where p.room_id = id and p.user_id = auth.uid()));
create policy if not exists "rooms_insert_host" on rooms
  for insert with check (host_id = auth.uid());
create policy if not exists "rooms_update_host" on rooms
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

-- players: participants can select; self join/leave; host manage
create policy if not exists "players_select_participants" on players
  for select using (is_room_participant(room_id));
create policy if not exists "players_insert_self" on players
  for insert with check (user_id = auth.uid());
create policy if not exists "players_update_self_or_host" on players
  for update using (user_id = auth.uid() or exists(select 1 from rooms r where r.id = room_id and r.host_id = auth.uid()))
  with check  (user_id = auth.uid() or exists(select 1 from rooms r where r.id = room_id and r.host_id = auth.uid()));
create policy if not exists "players_delete_self_or_host" on players
  for delete using (user_id = auth.uid() or exists(select 1 from rooms r where r.id = room_id and r.host_id = auth.uid()));

-- boards/categories/clues: participants can select; host inserts
create policy if not exists "boards_select_participants" on boards
  for select using (is_room_participant(room_id));
create policy if not exists "boards_insert_host" on boards
  for insert with check (exists(select 1 from rooms r where r.id = room_id and r.host_id = auth.uid()));



## Core Features
- Start/stop a game session; players join via link or code
- Author and manage clue sets (JR/DJ + Final) with preview
- Host dashboard to control states: reading, unlock/lock buzzer, adjudicate
- Player client for buzzing and answering
- Scoreboard with history
- **Multimedia clue support**: Images, audio, and video clues with preloading for instant playback
