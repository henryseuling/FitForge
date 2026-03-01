-- FitForge Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  level text not null default 'Intermediate',
  height text default '',
  weight text default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TRAINING SETTINGS
-- ============================================
create table public.training_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  split text not null default 'Push / Pull / Legs',
  frequency text not null default '6 days/week',
  progressive_overload boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.training_settings enable row level security;
create policy "Users manage own training settings" on public.training_settings for all using (auth.uid() = user_id);

-- ============================================
-- WORKOUTS
-- ============================================
create table public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  day_number int not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_minutes int,
  notes text
);

create index idx_workouts_user on public.workouts(user_id, started_at desc);

alter table public.workouts enable row level security;
create policy "Users manage own workouts" on public.workouts for all using (auth.uid() = user_id);

-- ============================================
-- EXERCISES (within a workout)
-- ============================================
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references public.workouts(id) on delete cascade not null,
  name text not null,
  muscle_group text not null,
  superset text default 'A',
  order_index int not null default 0,
  sets int not null default 3,
  reps_min int not null default 8,
  reps_max int not null default 12
);

create index idx_exercises_workout on public.exercises(workout_id, order_index);

alter table public.exercises enable row level security;
create policy "Users manage own exercises" on public.exercises for all
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- ============================================
-- COMPLETED SETS (logged during workout)
-- ============================================
create table public.completed_sets (
  id uuid primary key default uuid_generate_v4(),
  exercise_id uuid references public.exercises(id) on delete cascade not null,
  set_number int not null,
  weight numeric not null,
  reps int not null,
  rpe numeric,
  logged_at timestamptz not null default now()
);

create index idx_sets_exercise on public.completed_sets(exercise_id, set_number);

alter table public.completed_sets enable row level security;
create policy "Users manage own sets" on public.completed_sets for all
  using (exists (
    select 1 from public.exercises e
    join public.workouts w on w.id = e.workout_id
    where e.id = exercise_id and w.user_id = auth.uid()
  ));

-- ============================================
-- MEALS & FOOD ITEMS
-- ============================================
create table public.meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  meal_type text not null default 'other', -- breakfast, lunch, dinner, snack, other
  logged_at timestamptz not null default now()
);

create index idx_meals_user on public.meals(user_id, logged_at desc);

alter table public.meals enable row level security;
create policy "Users manage own meals" on public.meals for all using (auth.uid() = user_id);

create table public.food_items (
  id uuid primary key default uuid_generate_v4(),
  meal_id uuid references public.meals(id) on delete cascade not null,
  name text not null,
  calories int not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  quantity text default '1 serving'
);

create index idx_food_items_meal on public.food_items(meal_id);

alter table public.food_items enable row level security;
create policy "Users manage own food items" on public.food_items for all
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

-- ============================================
-- NUTRITION TARGETS
-- ============================================
create table public.nutrition_targets (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  calorie_target int not null default 2800,
  protein_target int not null default 180,
  carbs_target int not null default 300,
  fat_target int not null default 75,
  updated_at timestamptz not null default now()
);

alter table public.nutrition_targets enable row level security;
create policy "Users manage own nutrition targets" on public.nutrition_targets for all using (auth.uid() = user_id);

-- ============================================
-- BODY METRICS (weight, body fat, etc.)
-- ============================================
create table public.body_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  weight numeric,
  body_fat numeric,
  measured_at timestamptz not null default now()
);

create index idx_body_metrics_user on public.body_metrics(user_id, measured_at desc);

alter table public.body_metrics enable row level security;
create policy "Users manage own body metrics" on public.body_metrics for all using (auth.uid() = user_id);

-- ============================================
-- KEY LIFTS (PR tracking)
-- ============================================
create table public.key_lifts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  weight numeric not null,
  unit text not null default 'lbs',
  delta numeric default 0,
  logged_at timestamptz not null default now()
);

create index idx_key_lifts_user on public.key_lifts(user_id, name, logged_at desc);

alter table public.key_lifts enable row level security;
create policy "Users manage own key lifts" on public.key_lifts for all using (auth.uid() = user_id);

-- ============================================
-- CHAT HISTORY
-- ============================================
create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_chat_user on public.chat_messages(user_id, created_at desc);

alter table public.chat_messages enable row level security;
create policy "Users manage own chat messages" on public.chat_messages for all using (auth.uid() = user_id);

-- ============================================
-- HEALTH SNAPSHOTS (daily readiness data)
-- ============================================
create table public.health_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  readiness_score int,
  hrv int,
  resting_hr int,
  sleep_score int,
  recovery_score int,
  recorded_at date not null default current_date,
  unique(user_id, recorded_at)
);

create index idx_health_user on public.health_snapshots(user_id, recorded_at desc);

alter table public.health_snapshots enable row level security;
create policy "Users manage own health snapshots" on public.health_snapshots for all using (auth.uid() = user_id);
