import { create } from 'zustand';
import {
  fetchTodayWorkout,
  logSet as apiLogSet,
  createWorkout,
} from '@/lib/api';
import { fetchUpcomingWorkoutDraft } from '@/lib/upcomingWorkout';

// ─── Types ─────────────────────────────────────────────────────

export interface CompletedSet {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  isWarmup: boolean;
  perSide: boolean;
  bodyweight: boolean;
  note: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  superset?: string;
  supersetGroup: number | null;
  restBetweenSupersets: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: number;
  completedSets: CompletedSet[];
  perSide: boolean;
  bodyweight: boolean;
  estimated1RM: number | null;
  previousEstimated1RM: number | null;
  percentChange: number | null;
  bestSet: string | null;
  exerciseNotes: string;
}

export interface CardioEntry {
  id: string;
  type: string;
  duration: number;
  details: string;
}

export interface RecoveryEntry {
  id: string;
  type: string;
  duration: number;
  details: string;
}

export interface SessionStats {
  totalWorkingSets: number;
  totalVolume: number;
  volumeByMuscle: Record<string, number>;
  musclesTrained: string[];
}

// ─── State ─────────────────────────────────────────────────────

interface WorkoutState {
  // Readiness
  readinessScore: number | null;
  hrv: number | null;
  restingHR: number | null;
  sleepScore: number | null;
  recoveryScore: number | null;

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

  // New v2 fields
  splitType: string;
  sessionNotes: string;
  cardioEntries: CardioEntry[];
  recoveryEntries: RecoveryEntry[];

  // Actions
  logSet: (exerciseId: string, set: CompletedSet) => void;
  startRestTimer: () => void;
  skipRestTimer: () => void;
  addRestTime: (seconds: number) => void;
  decrementRestTimer: () => void;
  setActiveExercise: (index: number) => void;
  updateReadiness: (data: { score: number | null; hrv: number | null; restingHR: number | null; sleepScore: number | null; recoveryScore: number | null }) => void;
  startWorkout: () => Promise<void>;
  loadWorkout: () => Promise<void>;
  hydrateUpcomingWorkout: () => Promise<boolean>;
  reset: () => void;

  // v2 actions
  setSplitType: (splitType: string) => void;
  setSessionNotes: (notes: string) => void;
  addCardioEntry: (entry: CardioEntry) => void;
  removeCardioEntry: (id: string) => void;
  addRecoveryEntry: (entry: RecoveryEntry) => void;
  removeRecoveryEntry: (id: string) => void;
  createSuperset: (exerciseIds: string[]) => void;
  breakSuperset: (groupNumber: number) => void;
  toggleWarmup: (exerciseId: string, setNumber: number) => void;
}

// ─── Defaults ──────────────────────────────────────────────────

function defaultCompletedSet(partial: Partial<CompletedSet> & { setNumber: number; weight: number; reps: number }): CompletedSet {
  return {
    rir: null,
    isWarmup: false,
    perSide: false,
    bodyweight: false,
    note: '',
    ...partial,
  };
}

function defaultExercise(partial: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    muscleGroup: '',
    superset: undefined,
    supersetGroup: null,
    restBetweenSupersets: 60,
    sets: 0,
    repsMin: 0,
    repsMax: 0,
    weight: 0,
    completedSets: [],
    perSide: false,
    bodyweight: false,
    estimated1RM: null,
    previousEstimated1RM: null,
    percentChange: null,
    bestSet: null,
    exerciseNotes: '',
    ...partial,
  };
}

const INITIAL_STATE = {
  readinessScore: null as number | null,
  hrv: null as number | null,
  restingHR: null as number | null,
  sleepScore: null as number | null,
  recoveryScore: null as number | null,

  workoutName: '',
  dayNumber: 0,
  workoutId: null as string | null,
  exercises: [] as Exercise[],
  activeExerciseIndex: 0,
  restTimerSeconds: 0,
  restTimerDuration: 90,
  isRestTimerRunning: false,
  workoutStartedAt: null as number | null,

  splitType: '',
  sessionNotes: '',
  cardioEntries: [] as CardioEntry[],
  recoveryEntries: [] as RecoveryEntry[],
};

// ─── Store ─────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  ...INITIAL_STATE,

  hydrateUpcomingWorkout: async () => {
    const current = get();
    if (current.workoutStartedAt || current.exercises.length > 0 || current.workoutName) {
      return false;
    }

    const draft = await fetchUpcomingWorkoutDraft();
    if (!draft) return false;

    set({
      workoutName: draft.workoutName,
      dayNumber: draft.dayNumber,
      splitType: draft.splitType,
      sessionNotes: draft.sessionNotes,
      activeExerciseIndex: 0,
      exercises: draft.exercises.map((exercise) =>
        defaultExercise({
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: exercise.sets,
          repsMin: exercise.repsMin,
          repsMax: exercise.repsMax,
          weight: exercise.weight,
          estimated1RM: exercise.estimated1RM,
          exerciseNotes: exercise.exerciseNotes,
        })
      ),
    });

    return true;
  },

  logSet: (exerciseId, completedSet) => {
    const cs = defaultCompletedSet(completedSet);
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, completedSets: [...ex.completedSets, cs] }
          : ex
      ),
    }));
    // Persist to Supabase with new fields
    apiLogSet(exerciseId, cs.setNumber, cs.weight, cs.reps, cs.rir ?? undefined, {
      isWarmup: cs.isWarmup,
      perSide: cs.perSide,
      bodyweight: cs.bodyweight,
      note: cs.note,
    }).catch((err) => console.warn('Failed to persist set:', err));
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

  startWorkout: async () => {
    if (!get().workoutName || get().exercises.length === 0) {
      await get().hydrateUpcomingWorkout();
    }

    const startedAt = Date.now();
    set({ workoutStartedAt: startedAt, workoutId: null });
    const state = get();
    if (state.workoutName) {
      try {
        const persistedWorkout = await createWorkout(
          state.workoutName,
          state.dayNumber,
          state.exercises.map((exercise) => ({
            clientId: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            superset: exercise.superset,
            supersetGroup: exercise.supersetGroup,
            restBetweenSupersets: exercise.restBetweenSupersets,
            sets: exercise.sets,
            repsMin: exercise.repsMin,
            repsMax: exercise.repsMax,
            weight: exercise.weight,
            perSide: exercise.perSide,
            bodyweight: exercise.bodyweight,
            estimated1RM: exercise.estimated1RM,
            previousEstimated1RM: exercise.previousEstimated1RM,
            percentChange: exercise.percentChange,
            bestSet: exercise.bestSet,
            exerciseNotes: exercise.exerciseNotes,
          }))
        );

        const persistedExercises = [...(persistedWorkout.exercises || [])].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );

        set((current) => {
          if (current.workoutStartedAt !== startedAt) {
            return current;
          }

          return {
            workoutId: persistedWorkout.id,
            exercises: current.exercises.map((exercise, index) => ({
              ...exercise,
              id:
                persistedExercises[index]?.id ??
                persistedExercises.find((item) => item.exercise_id === exercise.id)?.id ??
                exercise.id,
            })),
          };
        });
      } catch {
        // Keep the local workout active even if persistence fails.
      }
    }
  },

  loadWorkout: async () => {
    try {
      const workout = await fetchTodayWorkout();
      if (!workout) {
        await get().hydrateUpcomingWorkout();
        return;
      }

      set({
        workoutId: workout.id,
        workoutName: workout.name || '',
        dayNumber: workout.day_number || 0,
        workoutStartedAt: workout.started_at ? new Date(workout.started_at).getTime() : null,
        splitType: workout.split_type || '',
        sessionNotes: workout.session_notes || '',
        exercises: (workout.exercises || []).map((ex: any) =>
          defaultExercise({
            id: ex.id,
            name: ex.name || '',
            muscleGroup: ex.muscle_group || '',
            superset: ex.superset_group || ex.superset || undefined,
            supersetGroup: ex.superset_group_num ?? null,
            restBetweenSupersets: ex.rest_between_supersets || 60,
            sets: ex.target_sets || ex.sets || 0,
            repsMin: ex.target_reps_min || ex.reps_min || 0,
            repsMax: ex.target_reps_max || ex.reps_max || 0,
            weight: ex.target_weight || 0,
            perSide: ex.per_side || false,
            bodyweight: ex.is_bodyweight || false,
            estimated1RM: ex.estimated_1rm ?? null,
            previousEstimated1RM: ex.previous_1rm ?? null,
            percentChange: ex.percent_change ?? null,
            bestSet: ex.best_set || null,
            exerciseNotes: ex.exercise_notes || '',
            completedSets: (ex.completed_sets || []).map((s: any) =>
              defaultCompletedSet({
                setNumber: s.set_number,
                weight: s.weight,
                reps: s.reps,
                rir: s.rir ?? s.rpe ?? null,
                isWarmup: s.is_warmup || false,
                perSide: s.per_side || false,
                bodyweight: s.is_bodyweight || false,
                note: s.note || '',
              })
            ),
          })
        ),
      });
    } catch {
      // No workout for today — that's fine
    }
  },

  // v2 actions
  setSplitType: (splitType) => set({ splitType }),
  setSessionNotes: (notes) => set({ sessionNotes: notes }),

  addCardioEntry: (entry) =>
    set((state) => ({ cardioEntries: [...state.cardioEntries, entry] })),

  removeCardioEntry: (id) =>
    set((state) => ({ cardioEntries: state.cardioEntries.filter((e) => e.id !== id) })),

  addRecoveryEntry: (entry) =>
    set((state) => ({ recoveryEntries: [...state.recoveryEntries, entry] })),

  removeRecoveryEntry: (id) =>
    set((state) => ({ recoveryEntries: state.recoveryEntries.filter((e) => e.id !== id) })),

  createSuperset: (exerciseIds) => {
    const state = get();
    const existingGroups = state.exercises
      .map((e) => e.supersetGroup)
      .filter((g): g is number => g !== null);
    const nextGroup = existingGroups.length > 0 ? Math.max(...existingGroups) + 1 : 1;

    set({
      exercises: state.exercises.map((ex) =>
        exerciseIds.includes(ex.id)
          ? { ...ex, supersetGroup: nextGroup }
          : ex
      ),
    });
  },

  breakSuperset: (groupNumber) =>
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.supersetGroup === groupNumber
          ? { ...ex, supersetGroup: null }
          : ex
      ),
    })),

  toggleWarmup: (exerciseId, setNumber) =>
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              completedSets: ex.completedSets.map((s) =>
                s.setNumber === setNumber
                  ? { ...s, isWarmup: !s.isWarmup }
                  : s
              ),
            }
          : ex
      ),
    })),

  reset: () => set(INITIAL_STATE),
}));
