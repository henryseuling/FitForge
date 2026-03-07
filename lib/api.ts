import { supabase } from './supabase';

// ============================================
// PROFILE
// ============================================

export async function fetchProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(updates: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw error;
}

// ============================================
// WORKOUTS
// ============================================

export async function fetchTodayWorkout() {
  // Use local date boundaries to avoid timezone mismatch
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      exercises (
        *,
        completed_sets (*)
      )
    `)
    .gte('started_at', startOfDay.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

interface WorkoutExerciseInput {
  clientId?: string;
  name: string;
  muscleGroup: string;
  superset?: string;
  supersetGroup?: number | null;
  restBetweenSupersets?: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: number;
  perSide?: boolean;
  bodyweight?: boolean;
  estimated1RM?: number | null;
  previousEstimated1RM?: number | null;
  percentChange?: number | null;
  bestSet?: string | null;
  exerciseNotes?: string;
}

async function insertExercisesForWorkout(workoutId: string, exercises: WorkoutExerciseInput[]) {
  const modernPayload = exercises.map((exercise, index) => ({
    workout_id: workoutId,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    order_index: index,
    target_sets: exercise.sets,
    target_reps_min: exercise.repsMin,
    target_reps_max: exercise.repsMax,
    target_weight: exercise.weight,
    superset_group: exercise.superset,
  }));

  const { data: modernData, error: modernError } = await supabase
    .from('exercises')
    .insert(modernPayload)
    .select('*');

  if (!modernError) {
    return modernData ?? [];
  }

  const legacyPayload = exercises.map((exercise, index) => ({
    workout_id: workoutId,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    order_index: index,
    sets: exercise.sets,
    reps_min: exercise.repsMin,
    reps_max: exercise.repsMax,
    superset: exercise.superset ?? 'A',
  }));

  const { data: legacyData, error: legacyError } = await supabase
    .from('exercises')
    .insert(legacyPayload)
    .select('*');

  if (legacyError) throw legacyError;
  return legacyData ?? [];
}

export async function createWorkout(
  name: string,
  dayNumber: number,
  exercises: WorkoutExerciseInput[] = []
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, name, day_number: dayNumber })
    .select()
    .single();
  if (error) throw error;

  if (exercises.length === 0) {
    return { ...workout, exercises: [] };
  }

  const persistedExercises = await insertExercisesForWorkout(workout.id, exercises);

  return { ...workout, exercises: persistedExercises ?? [] };
}

export async function logSet(
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
  rpe?: number,
  extras?: { isWarmup?: boolean; perSide?: boolean; bodyweight?: boolean; note?: string }
) {
  const { error } = await supabase
    .from('completed_sets')
    .insert({
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      rpe: rpe != null ? (10 - rpe) : null,
      is_warmup: extras?.isWarmup || false,
      rir: rpe != null ? rpe : null,
      per_side: extras?.perSide || false,
      is_bodyweight: extras?.bodyweight || false,
      note: extras?.note || null,
    });
  if (!error) return;

  const { error: legacyError } = await supabase
    .from('completed_sets')
    .insert({
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      rpe: rpe ?? null,
    });
  if (legacyError) throw legacyError;
}

export async function completeWorkout(
  workoutId: string,
  durationMinutes: number,
  extras?: {
    splitType?: string;
    cardioData?: any;
    saunaData?: any;
    sessionNotes?: string;
    volumeByMuscle?: Record<string, number>;
    musclesTrained?: string[];
    totalWorkingSets?: number;
  }
) {
  const { error } = await supabase
    .from('workouts')
    .update({
      completed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      split_type: extras?.splitType || null,
      cardio_data: extras?.cardioData || null,
      sauna_data: extras?.saunaData || null,
      session_notes: extras?.sessionNotes || null,
      volume_by_muscle: extras?.volumeByMuscle || null,
      muscles_trained: extras?.musclesTrained || null,
      total_working_sets: extras?.totalWorkingSets || null,
    })
    .eq('id', workoutId);
  if (error) throw error;
}

// ============================================
// MEALS
// ============================================

export async function fetchTodayMeals() {
  // Use local date boundaries to avoid timezone mismatch
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const { data, error } = await supabase
    .from('meals')
    .select(`
      *,
      food_items (*)
    `)
    .gte('logged_at', startOfDay.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function logMeal(name: string, mealType: string, items: Array<{
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert({ user_id: user.id, name, meal_type: mealType })
    .select()
    .single();
  if (mealError) throw mealError;

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('food_items')
      .insert(items.map((item) => ({ ...item, meal_id: meal.id })));
    if (itemsError) throw itemsError;
  }

  return meal;
}

// ============================================
// NUTRITION TARGETS
// ============================================

export async function fetchNutritionTargets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateNutritionTargets(targets: {
  calorie_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('nutrition_targets')
    .upsert({ user_id: user.id, ...targets, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ============================================
// PROGRESS / KEY LIFTS
// ============================================

export async function fetchKeyLifts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the most recent entry for each lift
  const { data, error } = await supabase
    .from('key_lifts')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false });

  if (error) throw error;

  // Deduplicate — keep the latest per lift name
  const seen = new Set<string>();
  return (data ?? []).filter((lift) => {
    if (seen.has(lift.name)) return false;
    seen.add(lift.name);
    return true;
  });
}

export async function logKeyLift(name: string, weight: number, unit = 'lbs') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get previous weight for delta
  const { data: prev } = await supabase
    .from('key_lifts')
    .select('weight')
    .eq('user_id', user.id)
    .eq('name', name)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single();

  const delta = prev ? weight - prev.weight : 0;

  const { error } = await supabase
    .from('key_lifts')
    .insert({ user_id: user.id, name, weight, unit, delta });
  if (error) throw error;
}

// ============================================
// BODY METRICS
// ============================================

export async function fetchBodyMetrics(limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function logBodyMetric(weight?: number, bodyFat?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('body_metrics')
    .insert({ user_id: user.id, weight, body_fat: bodyFat });
  if (error) throw error;
}

// ============================================
// CHAT MESSAGES
// ============================================

export async function fetchChatHistory(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function saveChatMessage(role: 'user' | 'assistant', content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, role, content });
  if (error) throw error;
}

// ============================================
// COACH MEMORY
// ============================================

export async function fetchCoachMemories(limit = 10) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('coach_memories')
    .select('*')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function saveCoachMemory(memory: {
  category: string;
  content: string;
  source?: string;
  pinned?: boolean;
  metadata?: Record<string, unknown> | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('coach_memories')
    .insert({
      user_id: user.id,
      category: memory.category,
      content: memory.content,
      source: memory.source || 'chat',
      pinned: memory.pinned || false,
      metadata: memory.metadata || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// HEALTH SNAPSHOTS
// ============================================

export async function saveHealthSnapshot(snapshot: {
  readiness_score: number;
  hrv: number;
  resting_hr: number;
  sleep_score: number;
  recovery_score: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('health_snapshots')
    .upsert({
      user_id: user.id,
      ...snapshot,
      recorded_at: new Date().toISOString().split('T')[0],
    });
  if (error) throw error;
}

// ============================================
// GOALS
// ============================================

export async function fetchGoals() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createGoal(goal: { type: string; title: string; target_value: number; current_value: number; unit: string; deadline?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: user.id, ...goal })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(goalId: string, updates: Record<string, any>) {
  const { error } = await supabase
    .from('goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', goalId);
  if (error) throw error;
}

export async function deleteGoal(goalId: string) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);
  if (error) throw error;
}

// ============================================
// WORKOUT PLANS
// ============================================

export async function fetchActiveWorkoutPlan() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveWorkoutPlan(plan: any, weekNumber: number, phase: string, notes: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Deactivate previous plans
  await supabase
    .from('workout_plans')
    .update({ active: false })
    .eq('user_id', user.id)
    .eq('active', true);

  const { data, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: user.id,
      plan_data: plan,
      week_number: weekNumber,
      periodization_phase: phase,
      coach_notes: notes,
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// WORKOUT HISTORY (enhanced)
// ============================================

export async function fetchWorkoutHistory(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workouts')
    .select('*, exercises(*, completed_sets(*))')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// WATER INTAKE
// ============================================

export async function fetchTodayWater() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('water_intake')
    .select('glasses')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.glasses ?? 0;
}

export async function updateWater(glasses: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('water_intake')
    .upsert({ user_id: user.id, glasses, date: today }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

// ============================================
// WEIGHT CHECKINS
// ============================================

export async function logWeightCheckin(weight: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('weight_checkins')
    .insert({ user_id: user.id, weight_kg: weight });
  if (error) throw error;
}

export async function fetchWeightCheckins(limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weight_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// HEALTH SNAPSHOTS
// ============================================

export async function fetchHealthHistory(days = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('health_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .gte('recorded_at', startDate.toISOString().split('T')[0])
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ============================================
// EXERCISE PROFILES
// ============================================

export async function upsertExerciseProfile(profile: {
  exercise_id: string;
  exercise_name: string;
  current_working_weight?: number;
  working_weight_range?: string;
  estimated_1rm?: number;
  last_weight_used?: number;
  last_reps?: number;
  total_times_performed?: number;
  is_favorite?: boolean;
  is_disliked?: boolean;
  notes?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_exercise_profiles')
    .upsert(
      { user_id: user.id, ...profile, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,exercise_id' }
    );
  if (error) throw error;
}

export async function fetchExerciseProfiles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_exercise_profiles')
    .select('*')
    .eq('user_id', user.id);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// 1RM HISTORY
// ============================================

export async function record1RMHistory(entry: {
  exercise_id: string;
  exercise_name: string;
  estimated_1rm: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('exercise_1rm_history')
    .insert({ user_id: user.id, ...entry });
  if (error) throw error;
}

export async function fetch1RMHistory(exerciseId: string, limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('exercise_1rm_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('exercise_id', exerciseId)
    .order('achieved_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// AI OBSERVATIONS
// ============================================

export async function saveAIObservations(observations: Array<{
  workout_id?: string;
  observation: string;
  category: string;
}>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (observations.length === 0) return;
  const rows = observations.map((o) => ({ user_id: user.id, ...o }));
  const { error } = await supabase.from('ai_observations').insert(rows);
  if (error) throw error;
}

export async function fetchAIObservations(limit = 10) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('ai_observations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============================================
// NEXT SESSION PLANS
// ============================================

export async function saveNextSessionPlan(plan: {
  split_type?: string;
  key_lifts?: any;
  adjustments?: any;
  coach_notes?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Expire previous pending plans
  await supabase
    .from('next_session_plans')
    .update({ used: true })
    .eq('user_id', user.id)
    .eq('used', false);

  const { data, error } = await supabase
    .from('next_session_plans')
    .insert({ user_id: user.id, ...plan })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchNextSessionPlan() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('next_session_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================
// DATA IMPORTS
// ============================================

export async function createDataImport(importData: {
  source: string;
  file_name?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('data_imports')
    .insert({ user_id: user.id, ...importData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDataImport(id: string, updates: {
  workouts_imported?: number;
  exercises_mapped?: number;
  status?: string;
}) {
  const { error } = await supabase
    .from('data_imports')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function bulkInsertImportedWorkouts(
  workouts: Array<{
    name: string;
    started_at: string;
    completed_at?: string;
    duration_minutes?: number;
    exercises: Array<{
      name: string;
      muscle_group?: string;
      exercise_id?: string;
      sets: Array<{
        set_number: number;
        weight: number;
        reps: number;
        is_warmup?: boolean;
        rpe?: number;
      }>;
    }>;
  }>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let totalWorkouts = 0;
  let totalExercises = 0;

  for (const workout of workouts) {
    const { data: w, error: wErr } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: workout.name,
        started_at: workout.started_at,
        completed_at: workout.completed_at || workout.started_at,
        duration_minutes: workout.duration_minutes || 0,
      })
      .select()
      .single();
    if (wErr || !w) continue;
    totalWorkouts++;

    for (const exercise of workout.exercises) {
      const { data: ex, error: exErr } = await supabase
        .from('exercises')
        .insert({
          workout_id: w.id,
          exercise_id: exercise.exercise_id || null,
          name: exercise.name,
          muscle_group: exercise.muscle_group || '',
          target_sets: exercise.sets.length,
          target_reps_min: 0,
          target_reps_max: 0,
          target_weight: 0,
        })
        .select()
        .single();
      if (exErr || !ex) continue;
      totalExercises++;

      if (exercise.sets.length > 0) {
        const setRows = exercise.sets.map((s) => ({
          exercise_id: ex.id,
          set_number: s.set_number,
          weight: s.weight,
          reps: s.reps,
          is_warmup: s.is_warmup || false,
          rpe: s.rpe,
        }));
        await supabase.from('completed_sets').insert(setRows);
      }
    }
  }

  return { totalWorkouts, totalExercises };
}
