BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frequency integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS units text NOT NULL DEFAULT 'imperial',
  ADD COLUMN IF NOT EXISTS rest_timer_duration integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS rest_timer_mode text NOT NULL DEFAULT 'Auto',
  ADD COLUMN IF NOT EXISTS notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS progressive_overload boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS training_split text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS macro_split text NOT NULL DEFAULT 'Balanced';

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS split_type text,
  ADD COLUMN IF NOT EXISTS cardio_data jsonb,
  ADD COLUMN IF NOT EXISTS sauna_data jsonb,
  ADD COLUMN IF NOT EXISTS session_notes text,
  ADD COLUMN IF NOT EXISTS volume_by_muscle jsonb,
  ADD COLUMN IF NOT EXISTS muscles_trained text[],
  ADD COLUMN IF NOT EXISTS total_working_sets integer;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS exercise_id text,
  ADD COLUMN IF NOT EXISTS target_sets integer,
  ADD COLUMN IF NOT EXISTS target_reps_min integer,
  ADD COLUMN IF NOT EXISTS target_reps_max integer,
  ADD COLUMN IF NOT EXISTS target_weight numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS superset_group text,
  ADD COLUMN IF NOT EXISTS superset_group_num integer,
  ADD COLUMN IF NOT EXISTS rest_between_supersets integer,
  ADD COLUMN IF NOT EXISTS estimated_1rm numeric,
  ADD COLUMN IF NOT EXISTS best_set text,
  ADD COLUMN IF NOT EXISTS previous_1rm numeric,
  ADD COLUMN IF NOT EXISTS percent_change numeric,
  ADD COLUMN IF NOT EXISTS exercise_notes text,
  ADD COLUMN IF NOT EXISTS per_side boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false;

UPDATE public.exercises
SET
  target_sets = COALESCE(target_sets, sets),
  target_reps_min = COALESCE(target_reps_min, reps_min),
  target_reps_max = COALESCE(target_reps_max, reps_max),
  superset_group = COALESCE(superset_group, superset),
  rest_between_supersets = COALESCE(rest_between_supersets, 60),
  exercise_notes = COALESCE(exercise_notes, '')
WHERE
  target_sets IS NULL
  OR target_reps_min IS NULL
  OR target_reps_max IS NULL
  OR superset_group IS NULL
  OR rest_between_supersets IS NULL
  OR exercise_notes IS NULL;

ALTER TABLE public.completed_sets
  ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rir integer,
  ADD COLUMN IF NOT EXISTS per_side boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text;

UPDATE public.completed_sets
SET rir = COALESCE(rir, rpe)
WHERE rir IS NULL AND rpe IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.water_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glasses integer DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  UNIQUE(user_id, date)
);

ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text,
  deadline text,
  completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_exercise_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  current_working_weight numeric,
  working_weight_range text,
  estimated_1rm numeric,
  last_weight_used numeric,
  last_reps integer,
  total_times_performed integer NOT NULL DEFAULT 0,
  is_favorite boolean NOT NULL DEFAULT false,
  is_disliked boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_profiles_user ON public.user_exercise_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_profiles_exercise ON public.user_exercise_profiles(user_id, exercise_id);
ALTER TABLE public.user_exercise_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.exercise_1rm_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  estimated_1rm numeric NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_1rm_history_user ON public.exercise_1rm_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_1rm_history_exercise ON public.exercise_1rm_history(user_id, exercise_id, achieved_at DESC);
ALTER TABLE public.exercise_1rm_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  observation text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_observations_user ON public.ai_observations(user_id, created_at DESC);
ALTER TABLE public.ai_observations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.next_session_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_type text,
  key_lifts jsonb,
  adjustments jsonb,
  coach_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_next_session_plans_user ON public.next_session_plans(user_id, created_at DESC);
ALTER TABLE public.next_session_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  file_name text,
  workouts_imported integer NOT NULL DEFAULT 0,
  exercises_mapped integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_imports_user ON public.data_imports(user_id, imported_at DESC);
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data jsonb,
  week_number integer NOT NULL DEFAULT 1,
  periodization_phase text NOT NULL DEFAULT 'accumulation',
  coach_notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.workout_plans(user_id, created_at DESC);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.coach_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  source text NOT NULL DEFAULT 'chat',
  pinned boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_memories_user ON public.coach_memories(user_id, updated_at DESC);
ALTER TABLE public.coach_memories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  request_id text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  status_code integer NOT NULL DEFAULT 200,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  tool_count integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_created ON public.ai_request_logs(user_id, created_at DESC);
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_intake' AND policyname = 'water_intake_select'
  ) THEN
    CREATE POLICY "water_intake_select" ON public.water_intake
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_intake' AND policyname = 'water_intake_insert'
  ) THEN
    CREATE POLICY "water_intake_insert" ON public.water_intake
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_intake' AND policyname = 'water_intake_update'
  ) THEN
    CREATE POLICY "water_intake_update" ON public.water_intake
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_intake' AND policyname = 'water_intake_delete'
  ) THEN
    CREATE POLICY "water_intake_delete" ON public.water_intake
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'goals_select'
  ) THEN
    CREATE POLICY "goals_select" ON public.goals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'goals_insert'
  ) THEN
    CREATE POLICY "goals_insert" ON public.goals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'goals_update'
  ) THEN
    CREATE POLICY "goals_update" ON public.goals
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'goals' AND policyname = 'goals_delete'
  ) THEN
    CREATE POLICY "goals_delete" ON public.goals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_exercise_profiles' AND policyname = 'user_exercise_profiles_select'
  ) THEN
    CREATE POLICY "user_exercise_profiles_select" ON public.user_exercise_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_exercise_profiles' AND policyname = 'user_exercise_profiles_insert'
  ) THEN
    CREATE POLICY "user_exercise_profiles_insert" ON public.user_exercise_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_exercise_profiles' AND policyname = 'user_exercise_profiles_update'
  ) THEN
    CREATE POLICY "user_exercise_profiles_update" ON public.user_exercise_profiles
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_exercise_profiles' AND policyname = 'user_exercise_profiles_delete'
  ) THEN
    CREATE POLICY "user_exercise_profiles_delete" ON public.user_exercise_profiles
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercise_1rm_history' AND policyname = 'exercise_1rm_history_select'
  ) THEN
    CREATE POLICY "exercise_1rm_history_select" ON public.exercise_1rm_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercise_1rm_history' AND policyname = 'exercise_1rm_history_insert'
  ) THEN
    CREATE POLICY "exercise_1rm_history_insert" ON public.exercise_1rm_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercise_1rm_history' AND policyname = 'exercise_1rm_history_update'
  ) THEN
    CREATE POLICY "exercise_1rm_history_update" ON public.exercise_1rm_history
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercise_1rm_history' AND policyname = 'exercise_1rm_history_delete'
  ) THEN
    CREATE POLICY "exercise_1rm_history_delete" ON public.exercise_1rm_history
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_observations' AND policyname = 'ai_observations_select'
  ) THEN
    CREATE POLICY "ai_observations_select" ON public.ai_observations
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_observations' AND policyname = 'ai_observations_insert'
  ) THEN
    CREATE POLICY "ai_observations_insert" ON public.ai_observations
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_observations' AND policyname = 'ai_observations_update'
  ) THEN
    CREATE POLICY "ai_observations_update" ON public.ai_observations
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_observations' AND policyname = 'ai_observations_delete'
  ) THEN
    CREATE POLICY "ai_observations_delete" ON public.ai_observations
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'next_session_plans' AND policyname = 'next_session_plans_select'
  ) THEN
    CREATE POLICY "next_session_plans_select" ON public.next_session_plans
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'next_session_plans' AND policyname = 'next_session_plans_insert'
  ) THEN
    CREATE POLICY "next_session_plans_insert" ON public.next_session_plans
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'next_session_plans' AND policyname = 'next_session_plans_update'
  ) THEN
    CREATE POLICY "next_session_plans_update" ON public.next_session_plans
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'next_session_plans' AND policyname = 'next_session_plans_delete'
  ) THEN
    CREATE POLICY "next_session_plans_delete" ON public.next_session_plans
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_imports' AND policyname = 'data_imports_select'
  ) THEN
    CREATE POLICY "data_imports_select" ON public.data_imports
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_imports' AND policyname = 'data_imports_insert'
  ) THEN
    CREATE POLICY "data_imports_insert" ON public.data_imports
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_imports' AND policyname = 'data_imports_update'
  ) THEN
    CREATE POLICY "data_imports_update" ON public.data_imports
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'data_imports' AND policyname = 'data_imports_delete'
  ) THEN
    CREATE POLICY "data_imports_delete" ON public.data_imports
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workout_plans' AND policyname = 'workout_plans_select'
  ) THEN
    CREATE POLICY "workout_plans_select" ON public.workout_plans
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workout_plans' AND policyname = 'workout_plans_insert'
  ) THEN
    CREATE POLICY "workout_plans_insert" ON public.workout_plans
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workout_plans' AND policyname = 'workout_plans_update'
  ) THEN
    CREATE POLICY "workout_plans_update" ON public.workout_plans
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workout_plans' AND policyname = 'workout_plans_delete'
  ) THEN
    CREATE POLICY "workout_plans_delete" ON public.workout_plans
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_memories' AND policyname = 'coach_memories_select'
  ) THEN
    CREATE POLICY "coach_memories_select" ON public.coach_memories
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_memories' AND policyname = 'coach_memories_insert'
  ) THEN
    CREATE POLICY "coach_memories_insert" ON public.coach_memories
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_memories' AND policyname = 'coach_memories_update'
  ) THEN
    CREATE POLICY "coach_memories_update" ON public.coach_memories
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_memories' AND policyname = 'coach_memories_delete'
  ) THEN
    CREATE POLICY "coach_memories_delete" ON public.coach_memories
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_request_logs' AND policyname = 'ai_request_logs_select'
  ) THEN
    CREATE POLICY "ai_request_logs_select" ON public.ai_request_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_request_logs' AND policyname = 'ai_request_logs_insert'
  ) THEN
    CREATE POLICY "ai_request_logs_insert" ON public.ai_request_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_request_logs' AND policyname = 'ai_request_logs_update'
  ) THEN
    CREATE POLICY "ai_request_logs_update" ON public.ai_request_logs
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_request_logs' AND policyname = 'ai_request_logs_delete'
  ) THEN
    CREATE POLICY "ai_request_logs_delete" ON public.ai_request_logs
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

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

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.chat_messages WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.body_metrics') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.body_metrics WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.key_lifts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.key_lifts WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.nutrition_targets') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.nutrition_targets WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.weight_checkins') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.weight_checkins WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.water_intake') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.water_intake WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.goals') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.goals WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.workout_plans') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.workout_plans WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.coach_memories') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.coach_memories WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.ai_request_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.ai_request_logs WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.meals') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.meals WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.workouts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.workouts WHERE user_id = $1' USING uid;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles WHERE id = $1' USING uid;
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

COMMIT;
