-- ============================================================
-- FitForge — Supabase Migrations
-- Run these in order against your Supabase project.
-- ============================================================

-- 0. Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  level         text not null default '',
  height        text not null default '',
  weight        real not null default 0,
  age           integer not null default 0,
  gender        text not null default '',
  training_split text not null default '',
  macro_split   text not null default 'Balanced',
  rest_timer_mode text not null default 'Auto',
  rest_timer_duration integer not null default 90,
  progressive_overload boolean not null default true,
  goals         text[] not null default '{}',
  equipment     text[] not null default '{}',
  frequency     integer not null default 3,
  units         text not null default 'imperial',
  notifications boolean not null default true,
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. workouts
-- ============================================================
create table if not exists public.workouts (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null default '',
  day_number       integer not null default 1,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  duration_minutes integer not null default 0
);

alter table public.workouts enable row level security;

create policy "Users can CRUD own workouts"
  on public.workouts for all
  using (auth.uid() = user_id);

create index idx_workouts_user_started on public.workouts(user_id, started_at desc);

-- ============================================================
-- 3. exercises
-- ============================================================
create table if not exists public.exercises (
  id              uuid primary key default uuid_generate_v4(),
  workout_id      uuid not null references public.workouts(id) on delete cascade,
  name            text not null,
  muscle_group    text not null default '',
  superset_group  text,
  target_sets     integer not null default 3,
  target_reps_min integer not null default 8,
  target_reps_max integer not null default 12,
  target_weight   real not null default 0
);

alter table public.exercises enable row level security;

create policy "Users can CRUD own exercises"
  on public.exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = exercises.workout_id and w.user_id = auth.uid()
    )
  );

create index idx_exercises_workout on public.exercises(workout_id);

-- ============================================================
-- 4. completed_sets
-- ============================================================
create table if not exists public.completed_sets (
  id           uuid primary key default uuid_generate_v4(),
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  set_number   integer not null default 1,
  weight       real not null default 0,
  reps         integer not null default 0,
  rpe          real
);

alter table public.completed_sets enable row level security;

create policy "Users can CRUD own completed_sets"
  on public.completed_sets for all
  using (
    exists (
      select 1 from public.exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = completed_sets.exercise_id and w.user_id = auth.uid()
    )
  );

create index idx_completed_sets_exercise on public.completed_sets(exercise_id);

-- ============================================================
-- 5. meals
-- ============================================================
create table if not exists public.meals (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  name      text not null default '',
  meal_type text not null default 'snack',
  logged_at timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "Users can CRUD own meals"
  on public.meals for all
  using (auth.uid() = user_id);

create index idx_meals_user_logged on public.meals(user_id, logged_at desc);

-- ============================================================
-- 6. food_items
-- ============================================================
create table if not exists public.food_items (
  id       uuid primary key default uuid_generate_v4(),
  meal_id  uuid not null references public.meals(id) on delete cascade,
  name     text not null default '',
  calories integer not null default 0,
  protein  real not null default 0,
  carbs    real not null default 0,
  fat      real not null default 0
);

alter table public.food_items enable row level security;

create policy "Users can CRUD own food_items"
  on public.food_items for all
  using (
    exists (
      select 1 from public.meals m
      where m.id = food_items.meal_id and m.user_id = auth.uid()
    )
  );

create index idx_food_items_meal on public.food_items(meal_id);

-- ============================================================
-- 7. nutrition_targets
-- ============================================================
create table if not exists public.nutrition_targets (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  calorie_target integer not null default 2000,
  protein_target integer not null default 150,
  carbs_target   integer not null default 250,
  fat_target     integer not null default 65,
  updated_at     timestamptz not null default now()
);

alter table public.nutrition_targets enable row level security;

create policy "Users can CRUD own nutrition_targets"
  on public.nutrition_targets for all
  using (auth.uid() = user_id);

-- ============================================================
-- 8. key_lifts
-- ============================================================
create table if not exists public.key_lifts (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  name      text not null,
  weight    real not null default 0,
  unit      text not null default 'lbs',
  delta     real not null default 0,
  logged_at timestamptz not null default now()
);

alter table public.key_lifts enable row level security;

create policy "Users can CRUD own key_lifts"
  on public.key_lifts for all
  using (auth.uid() = user_id);

create index idx_key_lifts_user on public.key_lifts(user_id, logged_at desc);

-- ============================================================
-- 9. body_metrics
-- ============================================================
create table if not exists public.body_metrics (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  weight      real not null default 0,
  body_fat    real,
  measured_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

create policy "Users can CRUD own body_metrics"
  on public.body_metrics for all
  using (auth.uid() = user_id);

create index idx_body_metrics_user on public.body_metrics(user_id, measured_at desc);

-- ============================================================
-- 10. chat_messages
-- ============================================================
create table if not exists public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can CRUD own chat_messages"
  on public.chat_messages for all
  using (auth.uid() = user_id);

create index idx_chat_messages_user on public.chat_messages(user_id, created_at desc);

-- ============================================================
-- 11. health_snapshots
-- ============================================================
create table if not exists public.health_snapshots (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  recorded_at    date not null default current_date,
  readiness_score integer,
  hrv            integer,
  resting_hr     integer,
  sleep_score    integer,
  recovery_score integer,
  primary key (user_id, recorded_at)
);

alter table public.health_snapshots enable row level security;

create policy "Users can CRUD own health_snapshots"
  on public.health_snapshots for all
  using (auth.uid() = user_id);

create index idx_health_snapshots_user on public.health_snapshots(user_id, recorded_at desc);

-- ============================================================
-- 12. RPC: delete_user_account
-- Deletes all user data and the auth user. Must be called
-- by the authenticated user themselves.
-- ============================================================
create or replace function public.delete_user_account()
returns void as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascading deletes handle child rows via foreign keys.
  delete from public.profiles where id = uid;

  -- Remove auth user last (requires service_role or security definer)
  delete from auth.users where id = uid;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users
grant execute on function public.delete_user_account() to authenticated;
