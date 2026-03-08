import { create } from 'zustand';
import {
  fetchKeyLifts,
  fetchBodyMetrics,
  fetchWorkoutHistory,
  fetchWeightCheckins,
  fetchExerciseProfiles,
  logKeyLift as apiLogKeyLift,
  logBodyMetric,
  logWeightCheckin,
  fetchHealthHistory,
} from '@/lib/api';
import { useUserStore } from './useUserStore';

export interface KeyLift {
  name: string;
  weight: number;
  delta: number;
  unit: string;
}

export interface VolumeData {
  muscle: string;
  sets: number;
  maxSets: number;
}

export interface WorkoutHistoryEntry {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  exercises?: any[];
}

export interface WeightCheckin {
  id: string;
  weight_kg: number;
  logged_at: string;
}

export interface PersonalRecord {
  name: string;
  weight: number;
  date: string;
}

interface ProgressState {
  mStrengthScore: number;
  mStrengthDelta: number;
  mStrengthTier: string;
  mStrengthNextTier: number;

  keyLifts: KeyLift[];
  volumeData: VolumeData[];

  // Body metrics
  weight: number;
  sleepAvg: number;
  hrvAvg: number;
  streak: number;

  // New data
  workoutHistory: WorkoutHistoryEntry[];
  weightHistory: WeightCheckin[];
  personalRecords: PersonalRecord[];

  period: 'week' | 'month' | 'all';
  setPeriod: (period: 'week' | 'month' | 'all') => void;
  updateKeyLift: (lift: { name: string; weight: number }) => void;
  logBodyWeight: (weight: number) => void;
  loadProgress: () => Promise<void>;
  reset: () => void;
}

function getPeriodStart(period: 'week' | 'month' | 'all'): Date | null {
  if (period === 'all') return null;
  const start = new Date();
  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function filterHistoryByPeriod(history: WorkoutHistoryEntry[], period: 'week' | 'month' | 'all') {
  const start = getPeriodStart(period);
  if (!start) return history;
  return history.filter((entry) => new Date(entry.started_at) >= start);
}

function buildVolumeData(history: WorkoutHistoryEntry[], period: 'week' | 'month' | 'all'): VolumeData[] {
  const filtered = filterHistoryByPeriod(history, period);
  const byMuscle = new Map<string, number>();

  for (const workout of filtered) {
    for (const exercise of workout.exercises || []) {
      const muscle = exercise.muscle_group || exercise.muscleGroup || 'Other';
      const completedSets = (exercise.completed_sets || []).filter((set: any) => !set.is_warmup);
      const setCount = completedSets.length;
      if (setCount === 0) continue;
      byMuscle.set(muscle, (byMuscle.get(muscle) || 0) + setCount);
    }
  }

  const maxSets = Math.max(...Array.from(byMuscle.values()), 1);
  return Array.from(byMuscle.entries())
    .map(([muscle, sets]) => ({ muscle, sets, maxSets }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 6);
}

function computeStrengthMetrics(keyLifts: KeyLift[]) {
  const score = Math.round(keyLifts.reduce((sum, lift) => sum + lift.weight, 0));
  const delta = Math.round(keyLifts.reduce((sum, lift) => sum + lift.delta, 0));
  const tiers = [
    { label: 'Base', max: 405 },
    { label: 'Build', max: 675 },
    { label: 'Forge', max: 945 },
    { label: 'Elite', max: 1260 },
  ];
  const tier = tiers.find((entry) => score < entry.max) || tiers[tiers.length - 1];

  return {
    mStrengthScore: score,
    mStrengthDelta: delta,
    mStrengthTier: tier.label,
    mStrengthNextTier: tier.max,
  };
}

function deriveKeyLiftsFromProfiles(
  profiles: Array<{ exercise_name?: string; estimated_1rm?: number | null; current_working_weight?: number | null }>
): KeyLift[] {
  return profiles
    .filter((profile) => profile.exercise_name && (profile.estimated_1rm || profile.current_working_weight))
    .sort((a, b) => (b.estimated_1rm || b.current_working_weight || 0) - (a.estimated_1rm || a.current_working_weight || 0))
    .slice(0, 6)
    .map((profile) => ({
      name: profile.exercise_name || 'Lift',
      weight: Math.round(profile.estimated_1rm || profile.current_working_weight || 0),
      delta: 0,
      unit: 'lb',
    }));
}

function deriveKeyLiftsFromHistory(history: WorkoutHistoryEntry[]): KeyLift[] {
  const bestByExercise = new Map<string, number>();

  for (const workout of history) {
    for (const exercise of workout.exercises || []) {
      const exerciseName = exercise.name || exercise.exercise_name;
      if (!exerciseName) continue;

      for (const set of exercise.completed_sets || []) {
        if (set.is_warmup) continue;
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        if (weight <= 0 || reps <= 0) continue;
        const estimated1RM = Math.round(weight * (1 + reps / 30));
        const current = bestByExercise.get(exerciseName) || 0;
        if (estimated1RM > current) {
          bestByExercise.set(exerciseName, estimated1RM);
        }
      }
    }
  }

  return Array.from(bestByExercise.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, weight]) => ({
      name,
      weight,
      delta: 0,
      unit: 'lb',
    }));
}

function calculateStreak(history: WorkoutHistoryEntry[]): number {
  if (history.length === 0) return 0;

  // Get unique dates (completed workouts only) sorted descending
  const workoutDates = new Set(
    history
      .filter((w) => w.completed_at)
      .map((w) => new Date(w.started_at).toISOString().split('T')[0])
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (workoutDates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // Today can be skipped (user might not have worked out yet today)
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function extractPersonalRecords(history: WorkoutHistoryEntry[]): PersonalRecord[] {
  const prMap = new Map<string, { weight: number; date: string }>();

  for (const workout of history) {
    if (!workout.exercises) continue;
    for (const exercise of workout.exercises) {
      if (!exercise.completed_sets) continue;
      for (const set of exercise.completed_sets) {
        const name = exercise.name as string;
        const weight = set.weight as number;
        if (!weight || weight <= 0) continue;

        const existing = prMap.get(name);
        if (!existing || weight > existing.weight) {
          prMap.set(name, {
            weight,
            date: workout.started_at,
          });
        }
      }
    }
  }

  return Array.from(prMap.entries())
    .map(([name, data]) => ({ name, weight: data.weight, date: data.date }))
    .sort((a, b) => b.weight - a.weight);
}

const INITIAL_STATE = {
  mStrengthScore: 0,
  mStrengthDelta: 0,
  mStrengthTier: '',
  mStrengthNextTier: 0,

  keyLifts: [] as KeyLift[],
  volumeData: [] as VolumeData[],

  weight: 0,
  sleepAvg: 0,
  hrvAvg: 0,
  streak: 0,

  workoutHistory: [] as WorkoutHistoryEntry[],
  weightHistory: [] as WeightCheckin[],
  personalRecords: [] as PersonalRecord[],

  period: 'week' as const,
};

// ── Cached progress computations ──────────────────────────────────

let _historyHash = '';
let _cachedStreak = 0;
let _cachedPRs: PersonalRecord[] = [];

function getCachedStreak(history: WorkoutHistoryEntry[]): number {
  const hash = history.map((w) => w.id).join(',');
  if (hash === _historyHash) return _cachedStreak;
  _historyHash = hash;
  _cachedStreak = calculateStreak(history);
  _cachedPRs = extractPersonalRecords(history);
  return _cachedStreak;
}

function getCachedPRs(history: WorkoutHistoryEntry[]): PersonalRecord[] {
  const hash = history.map((w) => w.id).join(',');
  if (hash !== _historyHash) {
    _historyHash = hash;
    _cachedStreak = calculateStreak(history);
    _cachedPRs = extractPersonalRecords(history);
  }
  return _cachedPRs;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...INITIAL_STATE,

  setPeriod: (period) =>
    set((state) => ({
      period,
      volumeData: buildVolumeData(state.workoutHistory, period),
    })),

  updateKeyLift: ({ name, weight }) => {
    set((state) => {
      const exists = state.keyLifts.some((l) => l.name === name);
      if (exists) {
        return {
          keyLifts: state.keyLifts.map((l) =>
            l.name === name ? { ...l, delta: weight - l.weight, weight } : l
          ),
        };
      }
      // Add new lift if it doesn't exist
      return {
        keyLifts: [...state.keyLifts, { name, weight, delta: 0, unit: 'lb' }],
      };
    });
    // Persist to Supabase
    apiLogKeyLift(name, weight).catch((err) => console.warn('Failed to persist key lift:', err));
  },

  logBodyWeight: (weight) => {
    set({ weight });
    logBodyMetric(weight).catch((err) => console.warn('Failed to persist body metric:', err));
    const units = useUserStore.getState().units;
    const weightKg = units === 'imperial' ? Math.round((weight * 0.45359237) * 10) / 10 : weight;
    logWeightCheckin(weightKg).catch((err) => console.warn('Failed to persist weight checkin:', err));
  },

  loadProgress: async () => {
    try {
      const [lifts, metrics, history, weightCheckins, healthHistory, exerciseProfiles] = await Promise.all([
        fetchKeyLifts().catch(() => []),
        fetchBodyMetrics(1).catch(() => []),
        fetchWorkoutHistory(50).catch(() => []),
        fetchWeightCheckins(30).catch(() => []),
        fetchHealthHistory(30).catch(() => []),
        fetchExerciseProfiles().catch(() => []),
      ]);

      const updates: Record<string, any> = {};

      const explicitKeyLifts = (lifts || []).map((l: any) => ({
        name: l.name,
        weight: l.weight,
        delta: l.delta || 0,
        unit: l.unit || 'lb',
      }));
      const profileDerivedKeyLifts = deriveKeyLiftsFromProfiles(exerciseProfiles || []);
      const historyDerivedKeyLifts = deriveKeyLiftsFromHistory(history || []);
      const effectiveKeyLifts =
        explicitKeyLifts.length > 0
          ? explicitKeyLifts
          : profileDerivedKeyLifts.length > 0
            ? profileDerivedKeyLifts
            : historyDerivedKeyLifts;

      if (effectiveKeyLifts.length > 0) {
        updates.keyLifts = effectiveKeyLifts;
        Object.assign(updates, computeStrengthMetrics(effectiveKeyLifts));
      } else {
        Object.assign(updates, computeStrengthMetrics([]));
      }

      if (metrics && metrics.length > 0) {
        updates.weight = metrics[0].weight || 0;
      }

      if (history) {
        updates.workoutHistory = history;
        updates.streak = getCachedStreak(history);
        updates.personalRecords = getCachedPRs(history);
        updates.volumeData = buildVolumeData(history, get().period);
      }

      if (weightCheckins) {
        const units = useUserStore.getState().units;
        updates.weightHistory = weightCheckins.map((c: any) => ({
          id: c.id,
          weight_kg: units === 'imperial'
            ? Math.round((c.weight_kg * 2.20462262) * 10) / 10
            : c.weight_kg,
          logged_at: c.logged_at,
        }));
      }

      if (healthHistory && healthHistory.length > 0) {
        const totalSleep = healthHistory.reduce((sum: number, entry: any) => sum + (entry.sleep_score || 0), 0);
        const totalHRV = healthHistory.reduce((sum: number, entry: any) => sum + (entry.hrv || 0), 0);
        updates.sleepAvg = Math.round(totalSleep / healthHistory.length);
        updates.hrvAvg = Math.round(totalHRV / healthHistory.length);
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch {
      // Keep defaults on error
    }
  },

  reset: () => set(INITIAL_STATE),
}));
