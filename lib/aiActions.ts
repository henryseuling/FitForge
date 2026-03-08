import { createGoal, deleteGoal, saveCoachMemory } from './api';
import { saveNextSessionPlan } from './api';
import { generateOptimizedWorkoutPlan } from './workoutOptimizer';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { useUserStore } from '@/stores/useUserStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import type { ToolCall } from './claude';

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function ensureExerciseExists(exerciseId: string) {
  const exercise = useWorkoutStore.getState().exercises.find((item) => item.id === exerciseId);
  if (!exercise) {
    throw new Error('Exercise not found in the active workout');
  }
  return exercise;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

export interface AIUndoAction {
  kind:
    | 'remove_meal'
    | 'restore_nutrition_targets'
    | 'restore_water'
    | 'restore_profile'
    | 'restore_progressive_overload'
    | 'delete_goal'
    | 'restore_session_notes'
    | 'restore_exercise';
  payload: Record<string, unknown>;
  label: string;
}

function successResult(
  summary: string,
  extra: Record<string, unknown> = {},
  options?: { undo?: AIUndoAction; reviewRoute?: string }
) {
  return JSON.stringify({ success: true, summary, ...extra, undo: options?.undo, reviewRoute: options?.reviewRoute });
}

// ── Undo handlers ────────────────────────────────────────────────

const UNDO_HANDLERS: Record<string, (payload: Record<string, unknown>) => Promise<void>> = {
  remove_meal: async (payload) => {
    const mealId = asString(payload.mealId);
    if (!mealId) throw new Error('Missing meal id');
    useNutritionStore.getState().removeMeal(mealId);
  },
  restore_nutrition_targets: async (payload) => {
    useNutritionStore.getState().updateTargets(payload as any);
  },
  restore_water: async (payload) => {
    const glasses = asNumber(payload.glasses);
    if (glasses === null) throw new Error('Missing water amount');
    useNutritionStore.getState().setWaterGlasses(glasses);
  },
  restore_profile: async (payload) => {
    useUserStore.getState().updateProfile(payload as any);
  },
  restore_progressive_overload: async (payload) => {
    const value = typeof payload.value === 'boolean' ? payload.value : null;
    if (value === null) throw new Error('Missing overload value');
    useUserStore.getState().updateProfile({ progressiveOverload: value });
  },
  delete_goal: async (payload) => {
    const goalId = asString(payload.goalId);
    if (!goalId) throw new Error('Missing goal id');
    await deleteGoal(goalId);
  },
  restore_session_notes: async (payload) => {
    useWorkoutStore.getState().setSessionNotes(asString(payload.notes));
  },
  restore_exercise: async (payload) => {
    const exerciseId = asString(payload.exerciseId);
    const snapshot = asRecord(payload.snapshot);
    if (!exerciseId || !snapshot) throw new Error('Missing exercise restore data');
    useWorkoutStore.setState((state) => ({
      exercises: state.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...(snapshot as any) } : exercise
      ),
    }));
  },
};

export async function executeAIUndoAction(action: AIUndoAction): Promise<void> {
  const handler = UNDO_HANDLERS[action.kind];
  if (!handler) throw new Error('Unsupported undo action');
  await handler(action.payload);
}

// ── Tool handlers ────────────────────────────────────────────────

type ToolHandler = (input: Record<string, unknown>) => Promise<string>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  log_set: async (input) => {
    const exerciseId = asString(input.exerciseId);
    const setNumber = asNumber(input.setNumber);
    const weight = asNumber(input.weight);
    const reps = asNumber(input.reps);
    if (!exerciseId || setNumber === null || weight === null || reps === null) {
      throw new Error('Missing required set fields');
    }
    const exercise = ensureExerciseExists(exerciseId);
    useWorkoutStore.getState().logSet(exerciseId, {
      setNumber,
      weight,
      reps,
      rir: asNumber(input.rir),
      isWarmup: asBoolean(input.isWarmup),
      perSide: asBoolean(input.perSide),
      bodyweight: asBoolean(input.bodyweight),
      note: asString(input.note),
    });
    return successResult(`Logged set ${setNumber} for ${exercise.name}: ${weight} x ${reps}.`, {
      exerciseId, setNumber, weight, reps,
    });
  },

  set_active_exercise: async (input) => {
    const index = asNumber(input.index);
    if (index === null) throw new Error('Missing exercise index');
    const exercise = useWorkoutStore.getState().exercises[index];
    useWorkoutStore.getState().setActiveExercise(index);
    return successResult(
      exercise ? `Focused ${exercise.name} in the workout.` : `Changed the active exercise.`,
      { index }
    );
  },

  start_rest_timer: async () => {
    useWorkoutStore.getState().startRestTimer();
    return successResult('Started the rest timer.');
  },

  skip_rest_timer: async () => {
    useWorkoutStore.getState().skipRestTimer();
    return successResult('Skipped the rest timer.');
  },

  add_rest_time: async (input) => {
    const seconds = asNumber(input.seconds);
    if (seconds === null) throw new Error('Missing rest time');
    useWorkoutStore.getState().addRestTime(seconds);
    return successResult(`Added ${seconds} seconds to the rest timer.`, { seconds });
  },

  update_readiness: async (input) => {
    const score = asNumber(input.score);
    const hrv = asNumber(input.hrv);
    const restingHR = asNumber(input.restingHR);
    const sleepScore = asNumber(input.sleepScore);
    const recoveryScore = asNumber(input.recoveryScore);
    if ([score, hrv, restingHR, sleepScore, recoveryScore].some((v) => v === null)) {
      throw new Error('Missing readiness metrics');
    }
    useWorkoutStore.getState().updateReadiness({
      score: score!, hrv: hrv!, restingHR: restingHR!, sleepScore: sleepScore!, recoveryScore: recoveryScore!,
    });
    return successResult(`Updated readiness to ${score}/100 with the latest recovery metrics.`);
  },

  start_workout: async () => {
    await useWorkoutStore.getState().startWorkout();
    return successResult('Started the workout timer for this session.');
  },

  replace_exercise: async (input) => {
    const exerciseId = asString(input.exerciseId);
    const replacementName = asString(input.replacementName);
    if (!exerciseId || !replacementName) throw new Error('Missing replacement exercise details');
    const state = useWorkoutStore.getState();
    const existing = ensureExerciseExists(exerciseId);
    const previousExercise = {
      name: existing.name, muscleGroup: existing.muscleGroup, sets: existing.sets,
      repsMin: existing.repsMin, repsMax: existing.repsMax, weight: existing.weight,
      exerciseNotes: existing.exerciseNotes,
    };
    useWorkoutStore.setState({
      exercises: state.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise, name: replacementName,
              muscleGroup: asString(input.muscleGroup) || existing.muscleGroup,
              sets: asNumber(input.sets) ?? existing.sets,
              repsMin: asNumber(input.repsMin) ?? existing.repsMin,
              repsMax: asNumber(input.repsMax) ?? existing.repsMax,
              weight: asNumber(input.weight) ?? existing.weight,
              exerciseNotes: asString(input.note) || existing.exerciseNotes,
            }
          : exercise
      ),
    });
    return successResult(`Replaced ${existing.name} with ${replacementName}.`, { exerciseId, replacementName }, {
      undo: { kind: 'restore_exercise', payload: { exerciseId, snapshot: previousExercise }, label: 'Undo swap' },
      reviewRoute: '/active-workout',
    });
  },

  set_session_notes: async (input) => {
    const notes = asString(input.notes);
    const previousNotes = useWorkoutStore.getState().sessionNotes;
    useWorkoutStore.getState().setSessionNotes(notes);
    return successResult('Saved the session notes for this workout.', { notes }, {
      undo: { kind: 'restore_session_notes', payload: { notes: previousNotes }, label: 'Undo notes change' },
      reviewRoute: '/active-workout',
    });
  },

  optimize_next_workout: async (input) => handleWorkoutOptimization(input),
  adjust_next_workout: async (input) => handleWorkoutOptimization(input),

  add_meal: async (input) => {
    const type = asString(input.type) as 'breakfast' | 'lunch' | 'dinner' | 'snack';
    const time = asString(input.time) || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const totalCalories = asNumber(input.totalCalories);
    const protein = asNumber(input.protein);
    const carbs = asNumber(input.carbs);
    const fat = asNumber(input.fat);
    const mealName = asString(input.name);
    const foods = Array.isArray(input.foods)
      ? input.foods.map((food) => {
          const item = food as Record<string, unknown>;
          return {
            name: asString(item.name) || 'Food item',
            calories: asNumber(item.calories) ?? 0,
            protein: asNumber(item.protein) ?? 0,
            carbs: asNumber(item.carbs) ?? 0,
            fat: asNumber(item.fat) ?? 0,
          };
        })
      : [];
    if (!type || totalCalories === null || protein === null || carbs === null || fat === null) {
      throw new Error('Missing meal fields');
    }
    const mealId = Date.now().toString();
    useNutritionStore.getState().addMeal({
      id: mealId, name: mealName, type, time, foods, totalCalories, protein, carbs, fat,
    });
    return successResult(
      `Logged ${mealName || type} for ${totalCalories} kcal${foods.length > 0 ? ` across ${foods.length} item${foods.length === 1 ? '' : 's'}` : ''}.`,
      { type, totalCalories, foods: foods.length },
      { undo: { kind: 'remove_meal', payload: { mealId }, label: 'Undo meal' }, reviewRoute: '/eat' }
    );
  },

  update_nutrition_targets: async (input) => {
    const nutritionState = useNutritionStore.getState();
    const previousTargets = {
      calorieTarget: nutritionState.calorieTarget, proteinTarget: nutritionState.proteinTarget,
      carbsTarget: nutritionState.carbsTarget, fatTarget: nutritionState.fatTarget,
    };
    const targets: Record<string, number> = {};
    const calorieTarget = asNumber(input.calorieTarget);
    const proteinTarget = asNumber(input.proteinTarget);
    const carbsTarget = asNumber(input.carbsTarget);
    const fatTarget = asNumber(input.fatTarget);
    if (calorieTarget !== null) targets.calorieTarget = calorieTarget;
    if (proteinTarget !== null) targets.proteinTarget = proteinTarget;
    if (carbsTarget !== null) targets.carbsTarget = carbsTarget;
    if (fatTarget !== null) targets.fatTarget = fatTarget;
    useNutritionStore.getState().updateTargets(targets);
    const changedTargets = Object.entries(targets)
      .map(([key, value]) => `${key.replace('Target', '')} ${value}`)
      .join(', ');
    return successResult(`Updated nutrition targets: ${changedTargets}.`, targets, {
      undo: { kind: 'restore_nutrition_targets', payload: previousTargets, label: 'Undo target change' },
      reviewRoute: '/settings/edit-nutrition',
    });
  },

  log_water: async (input) => {
    const glasses = asNumber(input.glasses);
    if (glasses === null) throw new Error('Missing water intake');
    const previousGlasses = useNutritionStore.getState().waterGlasses;
    useNutritionStore.getState().setWaterGlasses(glasses);
    return successResult(`Logged water intake at ${glasses} glass${glasses === 1 ? '' : 'es'}.`, { glasses }, {
      undo: { kind: 'restore_water', payload: { glasses: previousGlasses }, label: 'Undo water log' },
      reviewRoute: '/eat',
    });
  },

  update_key_lift: async (input) => {
    const name = asString(input.name);
    const weight = asNumber(input.weight);
    if (!name || weight === null) throw new Error('Missing key lift fields');
    useProgressStore.getState().updateKeyLift({ name, weight });
    return successResult(`Updated ${name} to ${weight} lb.`, { name, weight });
  },

  log_body_weight: async (input) => {
    const weight = asNumber(input.weight);
    if (weight === null) throw new Error('Missing body weight');
    useProgressStore.getState().logBodyWeight(weight);
    return successResult(`Logged body weight at ${weight} lb.`, { weight });
  },

  update_profile: async (input) => {
    const currentProfile = useUserStore.getState();
    const previousValues = Object.keys(input).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (currentProfile as any)[key];
      return acc;
    }, {});
    useUserStore.getState().updateProfile(input as any);
    const changedFields = Object.keys(input).join(', ');
    return successResult(`Updated your profile${changedFields ? `: ${changedFields}` : ''}.`, {}, {
      undo: { kind: 'restore_profile', payload: previousValues, label: 'Undo profile change' },
      reviewRoute: '/settings',
    });
  },

  toggle_progressive_overload: async () => {
    const before = useUserStore.getState().progressiveOverload;
    useUserStore.getState().toggleProgressiveOverload();
    const after = !before;
    return successResult(`Turned progressive overload ${after ? 'on' : 'off'}.`, {}, {
      undo: { kind: 'restore_progressive_overload', payload: { value: before }, label: 'Undo overload toggle' },
      reviewRoute: '/settings',
    });
  },

  create_goal: async (input) => {
    const title = asString(input.title);
    const type = asString(input.type) || 'goal';
    const targetValue = asNumber(input.targetValue);
    const currentValue = asNumber(input.currentValue) ?? 0;
    const unit = asString(input.unit);
    const deadline = asString(input.deadline);
    if (!title || targetValue === null || !unit) throw new Error('Missing goal fields');
    const goal = await createGoal({
      title, type, target_value: targetValue, current_value: currentValue,
      unit, deadline: deadline || undefined,
    });
    return successResult(`Created goal: ${title}.`, { id: goal.id, title }, {
      undo: { kind: 'delete_goal', payload: { goalId: goal.id }, label: 'Undo goal' },
      reviewRoute: '/goals',
    });
  },

  remember_preference: async (input) => {
    const category = asString(input.category) || 'general';
    const content = asString(input.content);
    if (!content) throw new Error('Missing preference content');
    const memory = await saveCoachMemory({
      category, content, source: 'chat',
      pinned: asBoolean(input.pinned), metadata: asRecord(input.metadata),
    });
    return successResult(`Saved a coach memory for ${category}.`, { id: memory.id, category, content });
  },
};

async function handleWorkoutOptimization(input: Record<string, unknown>): Promise<string> {
  const optimized = await generateOptimizedWorkoutPlan({
    instruction: asString(input.instruction),
    desiredFocus: asString(input.desiredFocus),
    availableTime: asNumber(input.availableTime),
    intensity: (asString(input.intensity) as 'easy' | 'moderate' | 'hard') || null,
    preferredExercises: asStringArray(input.preferredExercises),
    avoidExercises: asStringArray(input.avoidExercises),
  });

  await saveNextSessionPlan({
    split_type: optimized.splitType,
    key_lifts: optimized.keyLifts,
    adjustments: optimized.adjustments,
    coach_notes: optimized.coachNotes,
  });

  const workoutState = useWorkoutStore.getState();
  if (!workoutState.workoutStartedAt) {
    useWorkoutStore.getState().reset();
    await useWorkoutStore.getState().hydrateUpcomingWorkout().catch(() => false);
  }

  return successResult(
    `Built your next workout: ${optimized.workoutName} with ${optimized.keyLifts.length} exercises using the FitForge optimizer.`,
    {
      splitType: optimized.splitType,
      exercises: optimized.keyLifts.map((lift) => lift.exercise),
      algorithm: optimized.algorithm,
    },
    { reviewRoute: '/chat' }
  );
}

export async function executeAIToolCall(tc: ToolCall): Promise<string> {
  const handler = TOOL_HANDLERS[tc.name];
  if (!handler) {
    throw new Error(`Unknown tool: ${tc.name}`);
  }
  return handler(tc.input as Record<string, unknown>);
}
