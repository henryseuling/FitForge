import { createGoal, deleteGoal, saveCoachMemory } from './api';
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

export async function executeAIUndoAction(action: AIUndoAction): Promise<void> {
  switch (action.kind) {
    case 'remove_meal': {
      const mealId = asString(action.payload.mealId);
      if (!mealId) throw new Error('Missing meal id');
      useNutritionStore.getState().removeMeal(mealId);
      return;
    }
    case 'restore_nutrition_targets':
      useNutritionStore.getState().updateTargets(action.payload as any);
      return;
    case 'restore_water': {
      const glasses = asNumber(action.payload.glasses);
      if (glasses === null) throw new Error('Missing water amount');
      useNutritionStore.getState().setWaterGlasses(glasses);
      return;
    }
    case 'restore_profile':
      useUserStore.getState().updateProfile(action.payload as any);
      return;
    case 'restore_progressive_overload': {
      const value = typeof action.payload.value === 'boolean' ? action.payload.value : null;
      if (value === null) throw new Error('Missing overload value');
      useUserStore.getState().updateProfile({ progressiveOverload: value });
      return;
    }
    case 'delete_goal': {
      const goalId = asString(action.payload.goalId);
      if (!goalId) throw new Error('Missing goal id');
      await deleteGoal(goalId);
      return;
    }
    case 'restore_session_notes':
      useWorkoutStore.getState().setSessionNotes(asString(action.payload.notes));
      return;
    case 'restore_exercise': {
      const exerciseId = asString(action.payload.exerciseId);
      const snapshot = asRecord(action.payload.snapshot);
      if (!exerciseId || !snapshot) throw new Error('Missing exercise restore data');
      useWorkoutStore.setState((state) => ({
        exercises: state.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, ...(snapshot as any) } : exercise
        ),
      }));
      return;
    }
    default:
      throw new Error('Unsupported undo action');
  }
}

export async function executeAIToolCall(tc: ToolCall): Promise<string> {
  const input = tc.input as Record<string, unknown>;

  switch (tc.name) {
    case 'log_set': {
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
        exerciseId,
        setNumber,
        weight,
        reps,
      });
    }

    case 'set_active_exercise': {
      const index = asNumber(input.index);
      if (index === null) throw new Error('Missing exercise index');
      const exercise = useWorkoutStore.getState().exercises[index];
      useWorkoutStore.getState().setActiveExercise(index);
      return successResult(
        exercise ? `Focused ${exercise.name} in the workout.` : `Changed the active exercise.`,
        { index }
      );
    }

    case 'start_rest_timer':
      useWorkoutStore.getState().startRestTimer();
      return successResult('Started the rest timer.');

    case 'skip_rest_timer':
      useWorkoutStore.getState().skipRestTimer();
      return successResult('Skipped the rest timer.');

    case 'add_rest_time': {
      const seconds = asNumber(input.seconds);
      if (seconds === null) throw new Error('Missing rest time');
      useWorkoutStore.getState().addRestTime(seconds);
      return successResult(`Added ${seconds} seconds to the rest timer.`, { seconds });
    }

    case 'update_readiness': {
      const score = asNumber(input.score);
      const hrv = asNumber(input.hrv);
      const restingHR = asNumber(input.restingHR);
      const sleepScore = asNumber(input.sleepScore);
      const recoveryScore = asNumber(input.recoveryScore);
      if ([score, hrv, restingHR, sleepScore, recoveryScore].some((value) => value === null)) {
        throw new Error('Missing readiness metrics');
      }
      useWorkoutStore.getState().updateReadiness({
        score: score!,
        hrv: hrv!,
        restingHR: restingHR!,
        sleepScore: sleepScore!,
        recoveryScore: recoveryScore!,
      });
      return successResult(`Updated readiness to ${score}/100 with the latest recovery metrics.`);
    }

    case 'start_workout':
      await useWorkoutStore.getState().startWorkout();
      return successResult('Started the workout timer for this session.');

    case 'replace_exercise': {
      const exerciseId = asString(input.exerciseId);
      const replacementName = asString(input.replacementName);
      if (!exerciseId || !replacementName) {
        throw new Error('Missing replacement exercise details');
      }
      const state = useWorkoutStore.getState();
      const existing = ensureExerciseExists(exerciseId);
      const previousExercise = {
        name: existing.name,
        muscleGroup: existing.muscleGroup,
        sets: existing.sets,
        repsMin: existing.repsMin,
        repsMax: existing.repsMax,
        weight: existing.weight,
        exerciseNotes: existing.exerciseNotes,
      };
      useWorkoutStore.setState({
        exercises: state.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                name: replacementName,
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
        undo: {
          kind: 'restore_exercise',
          payload: { exerciseId, snapshot: previousExercise },
          label: 'Undo swap',
        },
        reviewRoute: '/active-workout',
      });
    }

    case 'set_session_notes': {
      const notes = asString(input.notes);
      const previousNotes = useWorkoutStore.getState().sessionNotes;
      useWorkoutStore.getState().setSessionNotes(notes);
      return successResult('Saved the session notes for this workout.', { notes }, {
        undo: {
          kind: 'restore_session_notes',
          payload: { notes: previousNotes },
          label: 'Undo notes change',
        },
        reviewRoute: '/active-workout',
      });
    }

    case 'add_meal': {
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
        id: mealId,
        name: mealName,
        type,
        time,
        foods,
        totalCalories,
        protein,
        carbs,
        fat,
      });
      return successResult(
        `Logged ${mealName || type} for ${totalCalories} kcal${foods.length > 0 ? ` across ${foods.length} item${foods.length === 1 ? '' : 's'}` : ''}.`,
        { type, totalCalories, foods: foods.length },
        {
          undo: {
            kind: 'remove_meal',
            payload: { mealId },
            label: 'Undo meal',
          },
          reviewRoute: '/eat',
        }
      );
    }

    case 'update_nutrition_targets': {
      const nutritionState = useNutritionStore.getState();
      const previousTargets = {
        calorieTarget: nutritionState.calorieTarget,
        proteinTarget: nutritionState.proteinTarget,
        carbsTarget: nutritionState.carbsTarget,
        fatTarget: nutritionState.fatTarget,
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
        undo: {
          kind: 'restore_nutrition_targets',
          payload: previousTargets,
          label: 'Undo target change',
        },
        reviewRoute: '/settings/edit-nutrition',
      });
    }

    case 'log_water': {
      const glasses = asNumber(input.glasses);
      if (glasses === null) throw new Error('Missing water intake');
      const previousGlasses = useNutritionStore.getState().waterGlasses;
      useNutritionStore.getState().setWaterGlasses(glasses);
      return successResult(`Logged water intake at ${glasses} glass${glasses === 1 ? '' : 'es'}.`, { glasses }, {
        undo: {
          kind: 'restore_water',
          payload: { glasses: previousGlasses },
          label: 'Undo water log',
        },
        reviewRoute: '/eat',
      });
    }

    case 'update_key_lift': {
      const name = asString(input.name);
      const weight = asNumber(input.weight);
      if (!name || weight === null) throw new Error('Missing key lift fields');
      useProgressStore.getState().updateKeyLift({ name, weight });
      return successResult(`Updated ${name} to ${weight} lb.`, { name, weight });
    }

    case 'log_body_weight': {
      const weight = asNumber(input.weight);
      if (weight === null) throw new Error('Missing body weight');
      useProgressStore.getState().logBodyWeight(weight);
      return successResult(`Logged body weight at ${weight} lb.`, { weight });
    }

    case 'update_profile': {
      const currentProfile = useUserStore.getState();
      const previousValues = Object.keys(input).reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (currentProfile as any)[key];
        return acc;
      }, {});
      useUserStore.getState().updateProfile(input as any);
      const changedFields = Object.keys(input).join(', ');
      return successResult(`Updated your profile${changedFields ? `: ${changedFields}` : ''}.`, {}, {
        undo: {
          kind: 'restore_profile',
          payload: previousValues,
          label: 'Undo profile change',
        },
        reviewRoute: '/settings',
      });
    }

    case 'toggle_progressive_overload': {
      const before = useUserStore.getState().progressiveOverload;
      useUserStore.getState().toggleProgressiveOverload();
      const after = !before;
      return successResult(`Turned progressive overload ${after ? 'on' : 'off'}.`, {}, {
        undo: {
          kind: 'restore_progressive_overload',
          payload: { value: before },
          label: 'Undo overload toggle',
        },
        reviewRoute: '/settings',
      });
    }

    case 'create_goal': {
      const title = asString(input.title);
      const type = asString(input.type) || 'goal';
      const targetValue = asNumber(input.targetValue);
      const currentValue = asNumber(input.currentValue) ?? 0;
      const unit = asString(input.unit);
      const deadline = asString(input.deadline);
      if (!title || targetValue === null || !unit) {
        throw new Error('Missing goal fields');
      }
      const goal = await createGoal({
        title,
        type,
        target_value: targetValue,
        current_value: currentValue,
        unit,
        deadline: deadline || undefined,
      });
      return successResult(`Created goal: ${title}.`, { id: goal.id, title }, {
        undo: {
          kind: 'delete_goal',
          payload: { goalId: goal.id },
          label: 'Undo goal',
        },
        reviewRoute: '/goals',
      });
    }

    case 'remember_preference': {
      const category = asString(input.category) || 'general';
      const content = asString(input.content);
      if (!content) throw new Error('Missing preference content');
      const memory = await saveCoachMemory({
        category,
        content,
        source: 'chat',
        pinned: asBoolean(input.pinned),
        metadata: asRecord(input.metadata),
      });
      return successResult(`Saved a coach memory for ${category}.`, { id: memory.id, category, content });
    }

    default:
      throw new Error(`Unknown tool: ${tc.name}`);
  }
}
