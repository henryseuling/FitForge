import { create } from 'zustand';
import {
  fetchKeyLifts,
  fetchBodyMetrics,
  fetchWorkoutHistory,
  fetchWeightCheckins,
  logKeyLift as apiLogKeyLift,
  logBodyMetric,
} from '@/lib/api';

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

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...INITIAL_STATE,

  setPeriod: (period) => {
    set({ period });
    // Re-load progress data with new period
    get().loadProgress();
  },

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
    // Persist to Supabase
    logBodyMetric(weight).catch((err) => console.warn('Failed to persist body metric:', err));
  },

  loadProgress: async () => {
    try {
      const { period } = get();
      const historyLimit = period === 'week' ? 14 : period === 'month' ? 60 : 200;
      const weightLimit = period === 'week' ? 7 : period === 'month' ? 30 : 90;

      const [lifts, metrics, history, weightCheckins] = await Promise.all([
        fetchKeyLifts().catch(() => []),
        fetchBodyMetrics(1).catch(() => []),
        fetchWorkoutHistory(historyLimit).catch(() => []),
        fetchWeightCheckins(weightLimit).catch(() => []),
      ]);

      const updates: Record<string, any> = {};

      if (lifts && lifts.length > 0) {
        updates.keyLifts = lifts.map((l: any) => ({
          name: l.name,
          weight: l.weight,
          delta: l.delta || 0,
          unit: l.unit || 'lb',
        }));
      }

      if (metrics && metrics.length > 0) {
        updates.weight = metrics[0].weight || 0;
      }

      if (history) {
        updates.workoutHistory = history;
        updates.streak = calculateStreak(history);
        updates.personalRecords = extractPersonalRecords(history);
      }

      if (weightCheckins) {
        updates.weightHistory = weightCheckins.map((c: any) => ({
          id: c.id,
          weight_kg: c.weight_kg,
          logged_at: c.logged_at,
        }));
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
