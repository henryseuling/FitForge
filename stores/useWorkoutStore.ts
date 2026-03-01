import { create } from 'zustand';
import {
  fetchTodayWorkout,
  logSet as apiLogSet,
  createWorkout,
} from '@/lib/api';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  superset?: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: number;
  completedSets: CompletedSet[];
}

export interface CompletedSet {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number;
}

interface WorkoutState {
  // Readiness
  readinessScore: number;
  hrv: number;
  restingHR: number;
  sleepScore: number;
  recoveryScore: number;

  // Current workout
  workoutName: string;
  dayNumber: number;
  workoutId: string | null;
  exercises: Exercise[];
  activeExerciseIndex: number;
  restTimerSeconds: number;
  restTimerDuration: number;
  isRestTimerRunning: boolean;
  workoutStartedAt: number | null;

  // Actions
  logSet: (exerciseId: string, set: CompletedSet) => void;
  startRestTimer: () => void;
  skipRestTimer: () => void;
  addRestTime: (seconds: number) => void;
  decrementRestTimer: () => void;
  setActiveExercise: (index: number) => void;
  updateReadiness: (data: { score: number; hrv: number; restingHR: number; sleepScore: number; recoveryScore: number }) => void;
  startWorkout: () => void;
  loadWorkout: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE = {
  readinessScore: 0,
  hrv: 0,
  restingHR: 0,
  sleepScore: 0,
  recoveryScore: 0,

  workoutName: '',
  dayNumber: 0,
  workoutId: null as string | null,
  exercises: [] as Exercise[],
  activeExerciseIndex: 0,
  restTimerSeconds: 0,
  restTimerDuration: 90,
  isRestTimerRunning: false,
  workoutStartedAt: null as number | null,
};

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  ...INITIAL_STATE,

  logSet: (exerciseId, completedSet) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, completedSets: [...ex.completedSets, completedSet] }
          : ex
      ),
    }));
    // Persist to Supabase
    apiLogSet(exerciseId, completedSet.setNumber, completedSet.weight, completedSet.reps, completedSet.rir).catch(() => {});
  },

  startRestTimer: () =>
    set((state) => ({
      restTimerSeconds: state.restTimerDuration,
      isRestTimerRunning: true,
    })),

  skipRestTimer: () => set({ restTimerSeconds: 0, isRestTimerRunning: false }),

  addRestTime: (seconds) =>
    set((state) => ({ restTimerSeconds: state.restTimerSeconds + seconds })),

  decrementRestTimer: () =>
    set((state) => {
      const next = state.restTimerSeconds - 1;
      if (next <= 0) return { restTimerSeconds: 0, isRestTimerRunning: false };
      return { restTimerSeconds: next };
    }),

  setActiveExercise: (index) => set({ activeExerciseIndex: index }),

  updateReadiness: (data) =>
    set({
      readinessScore: data.score,
      hrv: data.hrv,
      restingHR: data.restingHR,
      sleepScore: data.sleepScore,
      recoveryScore: data.recoveryScore,
    }),

  startWorkout: () => {
    set({ workoutStartedAt: Date.now() });
    const state = get();
    if (state.workoutName) {
      createWorkout(state.workoutName, state.dayNumber).catch(() => {});
    }
  },

  loadWorkout: async () => {
    try {
      const workout = await fetchTodayWorkout();
      if (!workout) return;

      set({
        workoutId: workout.id,
        workoutName: workout.name || '',
        dayNumber: workout.day_number || 0,
        workoutStartedAt: workout.started_at ? new Date(workout.started_at).getTime() : null,
        exercises: (workout.exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.name || '',
          muscleGroup: ex.muscle_group || '',
          superset: ex.superset_group || undefined,
          sets: ex.target_sets || 0,
          repsMin: ex.target_reps_min || 0,
          repsMax: ex.target_reps_max || 0,
          weight: ex.target_weight || 0,
          completedSets: (ex.completed_sets || []).map((s: any) => ({
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
            rir: s.rpe || 0, // DB uses rpe, store uses rir
          })),
        })),
      });
    } catch {
      // No workout for today — that's fine
    }
  },

  reset: () => set(INITIAL_STATE),
}));
