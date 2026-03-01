-- ============================================================================
-- FitForge — Supabase Migrations (Complete)
-- Safe to run on an existing database: uses IF NOT EXISTS, DROP POLICY IF
-- EXISTS, ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, etc.
-- ============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 1. PROFILES (user_profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          text,
  name                  text NOT NULL DEFAULT '',
  avatar_url            text,
  height_cm             numeric,
  height                text NOT NULL DEFAULT '',
  weight_kg             numeric,
  weight                numeric NOT NULL DEFAULT 0,
  age                   integer NOT NULL DEFAULT 0,
  gender                text NOT NULL DEFAULT '',
  goals                 text[] NOT NULL DEFAULT '{}',
  experience_level      text,
  level                 text NOT NULL DEFAULT '',
  equipment             text[] NOT NULL DEFAULT '{}',
  workout_frequency     integer,
  frequency             integer NOT NULL DEFAULT 3,
  units_preference      text DEFAULT 'imperial',
  units                 text NOT NULL DEFAULT 'imperial',
  rest_timer_default    integer DEFAULT 60,
  rest_timer_duration   integer NOT NULL DEFAULT 90,
  rest_timer_mode       text NOT NULL DEFAULT 'Auto',
  notifications_enabled boolean DEFAULT true,
  notifications         boolean NOT NULL DEFAULT true,
  onboarding_completed  boolean DEFAULT false,
  favorite_exercises    text[] DEFAULT '{}',
  disliked_exercises    text[] DEFAULT '{}',
  progressive_overload  boolean NOT NULL DEFAULT true,
  training_split        text NOT NULL DEFAULT '',
  split                 text,
  macro_split           text NOT NULL DEFAULT 'Balanced',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Safely add every column that may be missing on an existing profiles table
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_frequency integer;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS units_preference text DEFAULT 'imperial';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rest_timer_default integer DEFAULT 60;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_exercises text[] DEFAULT '{}';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disliked_exercises text[] DEFAULT '{}';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS split text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
END $$;


-- ============================================================================
-- 2. WORKOUT PLANS (new table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data            jsonb,
  week_number          integer,
  periodization_phase  text,
  coach_notes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  active               boolean DEFAULT true
);


-- ============================================================================
-- 3. WORKOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id           uuid REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  name              text NOT NULL DEFAULT '',
  day_number        integer NOT NULL DEFAULT 1,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  duration_seconds  integer,
  duration_minutes  integer NOT NULL DEFAULT 0,
  total_volume      numeric,
  difficulty_rating text,
  status            text DEFAULT 'in_progress',
  ai_summary        text,
  notes             text
);

DO $$ BEGIN
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS plan_id uuid;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS total_volume numeric;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS difficulty_rating text;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS status text DEFAULT 'in_progress';
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS ai_summary text;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS notes text;

  -- Add FK to workout_plans if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workouts_plan_id_fkey'
      AND table_name = 'workouts'
  ) THEN
    BEGIN
      ALTER TABLE public.workouts
        ADD CONSTRAINT workouts_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.workout_plans(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;


-- ============================================================================
-- 4. EXERCISES (workout exercises)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id       uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id      text,
  name             text NOT NULL,
  muscle_group     text NOT NULL DEFAULT '',
  order_index      integer,
  target_sets      integer NOT NULL DEFAULT 3,
  target_reps      text,
  target_reps_min  integer NOT NULL DEFAULT 8,
  target_reps_max  integer NOT NULL DEFAULT 12,
  target_weight    numeric NOT NULL DEFAULT 0,
  superset_group   text
);

DO $$ BEGIN
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_id text;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS order_index integer;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS target_reps text;
END $$;


-- ============================================================================
-- 5. COMPLETED SETS (workout sets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.completed_sets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id    uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number     integer NOT NULL DEFAULT 1,
  reps           integer NOT NULL DEFAULT 0,
  reps_completed integer,
  weight         numeric NOT NULL DEFAULT 0,
  weight_kg      numeric,
  rpe            integer,
  completed      boolean DEFAULT false,
  is_pr          boolean DEFAULT false
);

DO $$ BEGIN
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS reps_completed integer;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS weight_kg numeric;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS is_pr boolean DEFAULT false;
END $$;


-- ============================================================================
-- 6. PERSONAL RECORDS (new table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.personal_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id    text,
  exercise_name  text,
  max_weight     numeric,
  max_reps       integer,
  achieved_at    timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 7. GOALS (new table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text NOT NULL,
  title          text NOT NULL,
  target_value   numeric,
  current_value  numeric DEFAULT 0,
  unit           text,
  deadline       text,
  completed      boolean DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 8. MEALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  meal_type  text NOT NULL DEFAULT 'snack',
  calories   numeric,
  protein    numeric,
  carbs      numeric,
  fat        numeric,
  logged_at  timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS calories numeric;
  ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS protein numeric;
  ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS carbs numeric;
  ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS fat numeric;
END $$;


-- ============================================================================
-- 9. FOOD ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.food_items (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id   uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name      text NOT NULL DEFAULT '',
  calories  numeric NOT NULL DEFAULT 0,
  protein   numeric NOT NULL DEFAULT 0,
  carbs     numeric NOT NULL DEFAULT 0,
  fat       numeric NOT NULL DEFAULT 0
);

DO $$ BEGIN
  ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS protein numeric DEFAULT 0;
  ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS carbs numeric DEFAULT 0;
  ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS fat numeric DEFAULT 0;
END $$;


-- ============================================================================
-- 10. WATER INTAKE (new table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.water_intake (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glasses  integer DEFAULT 0,
  date     date DEFAULT CURRENT_DATE,
  UNIQUE(user_id, date)
);


-- ============================================================================
-- 11. WEIGHT CHECK-INS (new table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weight_checkins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg  numeric,
  logged_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 12. NUTRITION TARGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nutrition_targets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_target  integer NOT NULL DEFAULT 2000,
  protein_target  integer NOT NULL DEFAULT 150,
  carbs_target    integer NOT NULL DEFAULT 250,
  fat_target      integer NOT NULL DEFAULT 65,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  -- If the old schema used user_id as PK instead of a separate id column, add id
  ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
  ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS protein_target integer DEFAULT 150;
  ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS carbs_target integer DEFAULT 250;
  ALTER TABLE public.nutrition_targets ADD COLUMN IF NOT EXISTS fat_target integer DEFAULT 65;
END $$;


-- ============================================================================
-- 13. KEY LIFTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.key_lifts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  weight     numeric NOT NULL DEFAULT 0,
  unit       text NOT NULL DEFAULT 'lbs',
  delta      numeric NOT NULL DEFAULT 0,
  logged_at  timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.key_lifts ADD COLUMN IF NOT EXISTS unit text DEFAULT 'lbs';
  ALTER TABLE public.key_lifts ADD COLUMN IF NOT EXISTS delta numeric DEFAULT 0;
END $$;


-- ============================================================================
-- 14. BODY METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight       numeric NOT NULL DEFAULT 0,
  body_fat     numeric,
  measured_at  timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.body_metrics ADD COLUMN IF NOT EXISTS body_fat numeric;
END $$;


-- ============================================================================
-- 15. CHAT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL,
  content     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 16. HEALTH SNAPSHOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.health_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  readiness_score  integer,
  hrv              integer,
  resting_hr       integer,
  sleep_score      integer,
  recovery_score   integer,
  recorded_at      date
);

DO $$ BEGIN
  -- If old schema used composite PK (user_id, recorded_at), add id column
  ALTER TABLE public.health_snapshots ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
  ALTER TABLE public.health_snapshots ADD COLUMN IF NOT EXISTS hrv integer;
  ALTER TABLE public.health_snapshots ADD COLUMN IF NOT EXISTS resting_hr integer;
  ALTER TABLE public.health_snapshots ADD COLUMN IF NOT EXISTS sleep_score integer;
  ALTER TABLE public.health_snapshots ADD COLUMN IF NOT EXISTS recovery_score integer;
END $$;


-- ============================================================================
-- INDEXES
-- ============================================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- workout_plans
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_created_at ON public.workout_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_workout_plans_active ON public.workout_plans(user_id, active);

-- workouts
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON public.workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON public.workouts(user_id, status);

-- exercises
CREATE INDEX IF NOT EXISTS idx_exercises_workout ON public.exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercises_exercise_id ON public.exercises(exercise_id);

-- completed_sets
CREATE INDEX IF NOT EXISTS idx_completed_sets_exercise ON public.completed_sets(exercise_id);

-- personal_records
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON public.personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved_at ON public.personal_records(user_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON public.personal_records(exercise_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals(user_id, created_at DESC);

-- meals
CREATE INDEX IF NOT EXISTS idx_meals_user_logged ON public.meals(user_id, logged_at DESC);

-- food_items
CREATE INDEX IF NOT EXISTS idx_food_items_meal ON public.food_items(meal_id);

-- water_intake
CREATE INDEX IF NOT EXISTS idx_water_intake_user_id ON public.water_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_water_intake_date ON public.water_intake(user_id, date);

-- weight_checkins
CREATE INDEX IF NOT EXISTS idx_weight_checkins_user_id ON public.weight_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_checkins_logged_at ON public.weight_checkins(user_id, logged_at DESC);

-- nutrition_targets
CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user_id ON public.nutrition_targets(user_id);

-- key_lifts
CREATE INDEX IF NOT EXISTS idx_key_lifts_user_logged ON public.key_lifts(user_id, logged_at DESC);

-- body_metrics
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_measured ON public.body_metrics(user_id, measured_at DESC);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);

-- health_snapshots
CREATE INDEX IF NOT EXISTS idx_health_snapshots_user_recorded ON public.health_snapshots(user_id, recorded_at DESC);


-- ============================================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- ============================================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_sets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_intake     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_checkins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_lifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_snapshots ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- RLS POLICIES
-- Drop existing policies first (idempotent), then re-create.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles (keyed on id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"     ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- workout_plans (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own workout_plans"   ON public.workout_plans;
DROP POLICY IF EXISTS "Users can insert own workout_plans"  ON public.workout_plans;
DROP POLICY IF EXISTS "Users can update own workout_plans"  ON public.workout_plans;
DROP POLICY IF EXISTS "Users can delete own workout_plans"  ON public.workout_plans;

CREATE POLICY "workout_plans_select" ON public.workout_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workout_plans_insert" ON public.workout_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_plans_update" ON public.workout_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_plans_delete" ON public.workout_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- workouts (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own workouts"        ON public.workouts;
DROP POLICY IF EXISTS "Users can view own workouts"        ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts"      ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts"      ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts"      ON public.workouts;

CREATE POLICY "workouts_select" ON public.workouts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workouts_insert" ON public.workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update" ON public.workouts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_delete" ON public.workouts
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- exercises (access through workout ownership)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own exercises"       ON public.exercises;
DROP POLICY IF EXISTS "Users can view own exercises"       ON public.exercises;
DROP POLICY IF EXISTS "Users can insert own exercises"     ON public.exercises;
DROP POLICY IF EXISTS "Users can update own exercises"     ON public.exercises;
DROP POLICY IF EXISTS "Users can delete own exercises"     ON public.exercises;

CREATE POLICY "exercises_select" ON public.exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = exercises.workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "exercises_insert" ON public.exercises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = exercises.workout_id AND w.user_id = auth.uid())
  );
CREATE POLICY "exercises_update" ON public.exercises
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = exercises.workout_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = exercises.workout_id AND w.user_id = auth.uid()));
CREATE POLICY "exercises_delete" ON public.exercises
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = exercises.workout_id AND w.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- completed_sets (access through exercise -> workout ownership)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own completed_sets"  ON public.completed_sets;
DROP POLICY IF EXISTS "Users can view own completed_sets"  ON public.completed_sets;
DROP POLICY IF EXISTS "Users can insert own completed_sets" ON public.completed_sets;
DROP POLICY IF EXISTS "Users can update own completed_sets" ON public.completed_sets;
DROP POLICY IF EXISTS "Users can delete own completed_sets" ON public.completed_sets;

CREATE POLICY "completed_sets_select" ON public.completed_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      JOIN public.workouts w ON w.id = e.workout_id
      WHERE e.id = completed_sets.exercise_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "completed_sets_insert" ON public.completed_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      JOIN public.workouts w ON w.id = e.workout_id
      WHERE e.id = completed_sets.exercise_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "completed_sets_update" ON public.completed_sets
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.exercises e
    JOIN public.workouts w ON w.id = e.workout_id
    WHERE e.id = completed_sets.exercise_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercises e
    JOIN public.workouts w ON w.id = e.workout_id
    WHERE e.id = completed_sets.exercise_id AND w.user_id = auth.uid()
  ));
CREATE POLICY "completed_sets_delete" ON public.completed_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      JOIN public.workouts w ON w.id = e.workout_id
      WHERE e.id = completed_sets.exercise_id AND w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- personal_records (keyed on user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "personal_records_select" ON public.personal_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "personal_records_insert" ON public.personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "personal_records_update" ON public.personal_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "personal_records_delete" ON public.personal_records
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- goals (keyed on user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "goals_select" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- meals (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own meals" ON public.meals;

CREATE POLICY "meals_select" ON public.meals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert" ON public.meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update" ON public.meals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_delete" ON public.meals
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- food_items (access through meal ownership)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own food_items" ON public.food_items;

CREATE POLICY "food_items_select" ON public.food_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND m.user_id = auth.uid())
  );
CREATE POLICY "food_items_insert" ON public.food_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND m.user_id = auth.uid())
  );
CREATE POLICY "food_items_update" ON public.food_items
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND m.user_id = auth.uid()));
CREATE POLICY "food_items_delete" ON public.food_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meals m WHERE m.id = food_items.meal_id AND m.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- water_intake (keyed on user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "water_intake_select" ON public.water_intake
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "water_intake_insert" ON public.water_intake
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water_intake_update" ON public.water_intake
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water_intake_delete" ON public.water_intake
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weight_checkins (keyed on user_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "weight_checkins_select" ON public.weight_checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_checkins_insert" ON public.weight_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_checkins_update" ON public.weight_checkins
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_checkins_delete" ON public.weight_checkins
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- nutrition_targets (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own nutrition_targets" ON public.nutrition_targets;

CREATE POLICY "nutrition_targets_select" ON public.nutrition_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "nutrition_targets_insert" ON public.nutrition_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_targets_update" ON public.nutrition_targets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nutrition_targets_delete" ON public.nutrition_targets
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- key_lifts (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own key_lifts" ON public.key_lifts;

CREATE POLICY "key_lifts_select" ON public.key_lifts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "key_lifts_insert" ON public.key_lifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "key_lifts_update" ON public.key_lifts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "key_lifts_delete" ON public.key_lifts
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- body_metrics (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own body_metrics" ON public.body_metrics;

CREATE POLICY "body_metrics_select" ON public.body_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "body_metrics_insert" ON public.body_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "body_metrics_update" ON public.body_metrics
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "body_metrics_delete" ON public.body_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chat_messages (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own chat_messages" ON public.chat_messages;

CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- health_snapshots (keyed on user_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can CRUD own health_snapshots" ON public.health_snapshots;

CREATE POLICY "health_snapshots_select" ON public.health_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "health_snapshots_insert" ON public.health_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "health_snapshots_update" ON public.health_snapshots
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "health_snapshots_delete" ON public.health_snapshots
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at auto-update trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- goals
DROP TRIGGER IF EXISTS trigger_goals_updated_at ON public.goals;
CREATE TRIGGER trigger_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- nutrition_targets
DROP TRIGGER IF EXISTS trigger_nutrition_targets_updated_at ON public.nutrition_targets;
CREATE TRIGGER trigger_nutrition_targets_updated_at
  BEFORE UPDATE ON public.nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Auto-create profile on auth.users insert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- RPC: delete_user_account
-- Deletes all user data across every table then removes the auth user.
-- Must be called by the authenticated user who wants to delete their account.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from leaf/independent tables first, then parents.
  -- CASCADE on FKs handles nested children (exercises->completed_sets, meals->food_items).
  DELETE FROM public.health_snapshots  WHERE user_id = uid;
  DELETE FROM public.chat_messages     WHERE user_id = uid;
  DELETE FROM public.body_metrics      WHERE user_id = uid;
  DELETE FROM public.key_lifts         WHERE user_id = uid;
  DELETE FROM public.nutrition_targets WHERE user_id = uid;
  DELETE FROM public.weight_checkins   WHERE user_id = uid;
  DELETE FROM public.water_intake      WHERE user_id = uid;
  DELETE FROM public.personal_records  WHERE user_id = uid;
  DELETE FROM public.goals             WHERE user_id = uid;
  DELETE FROM public.meals             WHERE user_id = uid;   -- cascades to food_items
  DELETE FROM public.workouts          WHERE user_id = uid;   -- cascades to exercises -> completed_sets
  DELETE FROM public.workout_plans     WHERE user_id = uid;
  DELETE FROM public.profiles          WHERE id = uid;

  -- Finally remove the auth user (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;


-- ============================================================================
-- UPGRADE: Workout System v2 — New tables, columns, and policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 17. USER EXERCISE PROFILES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_exercise_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id           text NOT NULL,
  exercise_name         text NOT NULL,
  current_working_weight numeric,
  working_weight_range  text,
  estimated_1rm         numeric,
  last_weight_used      numeric,
  last_reps             integer,
  total_times_performed integer NOT NULL DEFAULT 0,
  is_favorite           boolean NOT NULL DEFAULT false,
  is_disliked           boolean NOT NULL DEFAULT false,
  notes                 text,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_profiles_user ON public.user_exercise_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_profiles_exercise ON public.user_exercise_profiles(user_id, exercise_id);

ALTER TABLE public.user_exercise_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_exercise_profiles_select" ON public.user_exercise_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_exercise_profiles_insert" ON public.user_exercise_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_exercise_profiles_update" ON public.user_exercise_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_exercise_profiles_delete" ON public.user_exercise_profiles
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 18. EXERCISE 1RM HISTORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_1rm_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id     text NOT NULL,
  exercise_name   text NOT NULL,
  estimated_1rm   numeric NOT NULL,
  achieved_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_1rm_history_user ON public.exercise_1rm_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_1rm_history_exercise ON public.exercise_1rm_history(user_id, exercise_id, achieved_at DESC);

ALTER TABLE public.exercise_1rm_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_1rm_history_select" ON public.exercise_1rm_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "exercise_1rm_history_insert" ON public.exercise_1rm_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_1rm_history_update" ON public.exercise_1rm_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exercise_1rm_history_delete" ON public.exercise_1rm_history
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 19. AI OBSERVATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_observations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id      uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  observation     text NOT NULL,
  category        text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_observations_user ON public.ai_observations(user_id, created_at DESC);

ALTER TABLE public.ai_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_observations_select" ON public.ai_observations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_observations_insert" ON public.ai_observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_observations_update" ON public.ai_observations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_observations_delete" ON public.ai_observations
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 20. NEXT SESSION PLANS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.next_session_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_type      text,
  key_lifts       jsonb,
  adjustments     jsonb,
  coach_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  used            boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_next_session_plans_user ON public.next_session_plans(user_id, created_at DESC);

ALTER TABLE public.next_session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "next_session_plans_select" ON public.next_session_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "next_session_plans_insert" ON public.next_session_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "next_session_plans_update" ON public.next_session_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "next_session_plans_delete" ON public.next_session_plans
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 21. DATA IMPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_imports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source              text NOT NULL,
  file_name           text,
  workouts_imported   integer NOT NULL DEFAULT 0,
  exercises_mapped    integer NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'pending',
  imported_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_imports_user ON public.data_imports(user_id, imported_at DESC);

ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_imports_select" ON public.data_imports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "data_imports_insert" ON public.data_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "data_imports_update" ON public.data_imports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "data_imports_delete" ON public.data_imports
  FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- ALTER existing tables: completed_sets
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS rir integer;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS per_side boolean NOT NULL DEFAULT false;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false;
  ALTER TABLE public.completed_sets ADD COLUMN IF NOT EXISTS note text;
END $$;


-- ---------------------------------------------------------------------------
-- ALTER existing tables: workouts
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS split_type text;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS cardio_data jsonb;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS sauna_data jsonb;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS session_notes text;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS ai_observations text[];
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS next_session_recommendation jsonb;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS volume_by_muscle jsonb;
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS muscles_trained text[];
  ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS total_working_sets integer;
END $$;


-- ---------------------------------------------------------------------------
-- ALTER existing tables: exercises
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS superset_group_num integer;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS rest_between_supersets integer;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS estimated_1rm numeric;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS best_set text;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS previous_1rm numeric;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS percent_change numeric;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_notes text;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS per_side boolean NOT NULL DEFAULT false;
  ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false;
END $$;


-- ---------------------------------------------------------------------------
-- Update delete_user_account() to include new tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.data_imports         WHERE user_id = uid;
  DELETE FROM public.next_session_plans   WHERE user_id = uid;
  DELETE FROM public.ai_observations      WHERE user_id = uid;
  DELETE FROM public.exercise_1rm_history WHERE user_id = uid;
  DELETE FROM public.user_exercise_profiles WHERE user_id = uid;
  DELETE FROM public.health_snapshots     WHERE user_id = uid;
  DELETE FROM public.chat_messages        WHERE user_id = uid;
  DELETE FROM public.body_metrics         WHERE user_id = uid;
  DELETE FROM public.key_lifts            WHERE user_id = uid;
  DELETE FROM public.nutrition_targets    WHERE user_id = uid;
  DELETE FROM public.weight_checkins      WHERE user_id = uid;
  DELETE FROM public.water_intake         WHERE user_id = uid;
  DELETE FROM public.personal_records     WHERE user_id = uid;
  DELETE FROM public.goals                WHERE user_id = uid;
  DELETE FROM public.meals                WHERE user_id = uid;
  DELETE FROM public.workouts             WHERE user_id = uid;
  DELETE FROM public.workout_plans        WHERE user_id = uid;
  DELETE FROM public.profiles             WHERE id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
