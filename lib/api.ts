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
  // Use UTC date boundaries to avoid timezone drift
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      exercises (
        *,
        completed_sets (*)
      )
    `)
    .gte('started_at', todayUTC.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createWorkout(name: string, dayNumber: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, name, day_number: dayNumber })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logSet(exerciseId: string, setNumber: number, weight: number, reps: number, rpe?: number) {
  const { error } = await supabase
    .from('completed_sets')
    .insert({ exercise_id: exerciseId, set_number: setNumber, weight, reps, rpe });
  if (error) throw error;
}

export async function completeWorkout(workoutId: string, durationMinutes: number) {
  const { error } = await supabase
    .from('workouts')
    .update({ completed_at: new Date().toISOString(), duration_minutes: durationMinutes })
    .eq('id', workoutId);
  if (error) throw error;
}

// ============================================
// MEALS
// ============================================

export async function fetchTodayMeals() {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const { data, error } = await supabase
    .from('meals')
    .select(`
      *,
      food_items (*)
    `)
    .gte('logged_at', todayUTC.toISOString())
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
