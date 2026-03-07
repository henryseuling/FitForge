import { fetchActiveWorkoutPlan, fetchExerciseProfiles, fetchNextSessionPlan } from './api';
import { generateOptimizedWorkoutPlan } from './workoutOptimizer';

type ExerciseProfile = {
  exercise_name?: string | null;
  current_working_weight?: number | null;
  estimated_1rm?: number | null;
  notes?: string | null;
};

export interface UpcomingWorkoutExerciseDraft {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weight: number;
  estimated1RM: number | null;
  exerciseNotes: string;
}

export interface UpcomingWorkoutDraft {
  workoutName: string;
  dayNumber: number;
  splitType: string;
  sessionNotes: string;
  exercises: UpcomingWorkoutExerciseDraft[];
  source: 'next_session_plan' | 'workout_plan' | 'optimizer';
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function inferRepsRange(value: unknown): { repsMin: number; repsMax: number } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const reps = Math.max(1, Math.round(value));
    return { repsMin: reps, repsMax: reps };
  }

  if (typeof value === 'string') {
    const match = value.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      return { repsMin: Number(match[1]), repsMax: Number(match[2]) };
    }
    const single = value.match(/(\d+)/);
    if (single) {
      const reps = Number(single[1]);
      return { repsMin: reps, repsMax: reps };
    }
  }

  return { repsMin: 8, repsMax: 10 };
}

function inferMuscleGroup(name: string) {
  const normalized = name.toLowerCase();
  if (/(bench|chest|fly|press-up|push-up)/.test(normalized)) return 'Chest';
  if (/(row|pull|lat|back|deadlift)/.test(normalized)) return 'Back';
  if (/(squat|quad|leg|calf|lunge|hamstring|rdl)/.test(normalized)) return 'Legs';
  if (/(press|lateral|rear delt|shoulder)/.test(normalized)) return 'Shoulders';
  if (/(curl|tricep|bicep|hammer|extension)/.test(normalized)) return 'Arms';
  if (/(crunch|ab|core|plank)/.test(normalized)) return 'Core';
  return 'Other';
}

function normalizeKeyLifts(
  keyLifts: unknown,
  splitType: string,
  profiles: ExerciseProfile[]
): UpcomingWorkoutExerciseDraft[] {
  if (!Array.isArray(keyLifts)) return [];

  const profileMap = new Map(
    profiles
      .filter((profile) => profile.exercise_name)
      .map((profile) => [String(profile.exercise_name).toLowerCase(), profile])
  );

  return keyLifts
    .map((lift, index) => {
      const record = typeof lift === 'string' ? { name: lift } : (lift as Record<string, unknown>);
      const name = typeof record.name === 'string'
        ? record.name
        : typeof record.exercise === 'string'
          ? record.exercise
          : typeof record.exerciseName === 'string'
            ? record.exerciseName
            : typeof lift === 'string'
              ? lift
              : '';

      if (!name) return null;

      const profile = profileMap.get(name.toLowerCase());
      const reps = inferRepsRange(record.reps ?? record.repRange);
      const sets = typeof record.sets === 'number' && Number.isFinite(record.sets) ? Math.max(1, Math.round(record.sets)) : 3;
      const weight = typeof record.weight === 'number' && Number.isFinite(record.weight)
        ? record.weight
        : profile?.current_working_weight ?? 0;

      return {
        id: `planned-${slugify(name)}-${index}`,
        name,
        muscleGroup: typeof record.muscleGroup === 'string' ? record.muscleGroup : inferMuscleGroup(name),
        sets,
        repsMin: reps.repsMin,
        repsMax: reps.repsMax,
        weight,
        estimated1RM: profile?.estimated_1rm ?? null,
        exerciseNotes:
          (typeof record.note === 'string' ? record.note : '') ||
          (typeof profile?.notes === 'string' ? profile.notes : '') ||
          '',
      };
    })
    .filter((exercise): exercise is UpcomingWorkoutExerciseDraft => exercise !== null);
}

function dayNameForIndex(index: number) {
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index] || 'monday';
}

function deriveWorkoutFromWeeklyPlan(planData: any, profiles: ExerciseProfile[]): UpcomingWorkoutDraft | null {
  const schedule = planData?.weeklySchedule;
  if (!schedule || typeof schedule !== 'object') return null;

  const today = new Date();
  const currentIndex = (today.getDay() + 6) % 7;

  for (let offset = 0; offset < 7; offset += 1) {
    const index = (currentIndex + offset) % 7;
    const dayKey = dayNameForIndex(index);
    const entry = schedule[dayKey];
    if (!entry || entry.type !== 'workout') continue;

    const exercises = Array.isArray(entry.exercises)
      ? entry.exercises.map((exercise: any, exerciseIndex: number) => {
          const reps = inferRepsRange(exercise.reps);
          const profile = profiles.find(
            (item) => item.exercise_name?.toLowerCase() === String(exercise.exerciseName || exercise.name || '').toLowerCase()
          );
          const name = String(exercise.exerciseName || exercise.name || 'Exercise');
          return {
            id: `plan-${slugify(name)}-${exerciseIndex}`,
            name,
            muscleGroup: inferMuscleGroup(name),
            sets:
              typeof exercise.sets === 'number' && Number.isFinite(exercise.sets)
                ? Math.max(1, Math.round(exercise.sets))
                : 3,
            repsMin: reps.repsMin,
            repsMax: reps.repsMax,
            weight:
              typeof exercise.suggestedWeight === 'number' && Number.isFinite(exercise.suggestedWeight)
                ? exercise.suggestedWeight
                : profile?.current_working_weight ?? 0,
            estimated1RM: profile?.estimated_1rm ?? null,
            exerciseNotes: typeof exercise.notes === 'string' ? exercise.notes : '',
          };
        })
      : [];

    if (exercises.length === 0) continue;

    return {
      workoutName: String(entry.name || 'Upcoming Workout'),
      dayNumber: index + 1,
      splitType: String(planData?.periodizationPhase || ''),
      sessionNotes: typeof entry.warmup === 'string' ? entry.warmup : '',
      exercises,
      source: 'workout_plan',
    };
  }

  return null;
}

export async function fetchUpcomingWorkoutDraft(): Promise<UpcomingWorkoutDraft | null> {
  const [nextSessionPlan, activeWorkoutPlan, exerciseProfiles] = await Promise.all([
    fetchNextSessionPlan().catch(() => null),
    fetchActiveWorkoutPlan().catch(() => null),
    fetchExerciseProfiles().catch(() => []),
  ]);

  const profiles = exerciseProfiles as ExerciseProfile[];

  if (nextSessionPlan?.key_lifts) {
    const exercises = normalizeKeyLifts(
      nextSessionPlan.key_lifts,
      String(nextSessionPlan.split_type || 'Upcoming Workout'),
      profiles
    );

    if (exercises.length > 0) {
      return {
        workoutName: String(nextSessionPlan.split_type || 'Upcoming Workout'),
        dayNumber: 0,
        splitType: String(nextSessionPlan.split_type || ''),
        sessionNotes: typeof nextSessionPlan.coach_notes === 'string' ? nextSessionPlan.coach_notes : '',
        exercises,
        source: 'next_session_plan',
      };
    }
  }

  if (activeWorkoutPlan?.plan_data) {
    return deriveWorkoutFromWeeklyPlan(activeWorkoutPlan.plan_data, profiles);
  }

  const optimizedPlan = await generateOptimizedWorkoutPlan().catch(() => null);
  if (optimizedPlan?.keyLifts?.length) {
    const exercises = normalizeKeyLifts(
      optimizedPlan.keyLifts.map((lift) => ({
        exercise: lift.exercise,
        name: lift.exercise,
        sets: lift.sets,
        reps: lift.reps,
        weight: lift.weight,
        note: lift.note,
        muscleGroup: lift.muscleGroup,
      })),
      optimizedPlan.splitType,
      profiles
    );

    if (exercises.length > 0) {
      return {
        workoutName: optimizedPlan.workoutName,
        dayNumber: 0,
        splitType: optimizedPlan.splitType,
        sessionNotes: optimizedPlan.coachNotes,
        exercises,
        source: 'optimizer',
      };
    }
  }

  return null;
}
