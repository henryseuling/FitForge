import { createGoal, saveCoachMemory } from './api';
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
      ensureExerciseExists(exerciseId);
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
      return JSON.stringify({ success: true, exerciseId, setNumber, weight, reps });
    }

    case 'set_active_exercise': {
      const index = asNumber(input.index);
      if (index === null) throw new Error('Missing exercise index');
      useWorkoutStore.getState().setActiveExercise(index);
      return JSON.stringify({ success: true, index });
    }

    case 'start_rest_timer':
      useWorkoutStore.getState().startRestTimer();
      return JSON.stringify({ success: true });

    case 'skip_rest_timer':
      useWorkoutStore.getState().skipRestTimer();
      return JSON.stringify({ success: true });

    case 'add_rest_time': {
      const seconds = asNumber(input.seconds);
      if (seconds === null) throw new Error('Missing rest time');
      useWorkoutStore.getState().addRestTime(seconds);
      return JSON.stringify({ success: true, seconds });
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
      return JSON.stringify({ success: true });
    }

    case 'start_workout':
      await useWorkoutStore.getState().startWorkout();
      return JSON.stringify({ success: true });

    case 'replace_exercise': {
      const exerciseId = asString(input.exerciseId);
      const replacementName = asString(input.replacementName);
      if (!exerciseId || !replacementName) {
        throw new Error('Missing replacement exercise details');
      }
      const state = useWorkoutStore.getState();
      const existing = ensureExerciseExists(exerciseId);
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
      return JSON.stringify({ success: true, exerciseId, replacementName });
    }

    case 'set_session_notes': {
      const notes = asString(input.notes);
      useWorkoutStore.getState().setSessionNotes(notes);
      return JSON.stringify({ success: true, notes });
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
      useNutritionStore.getState().addMeal({
        id: Date.now().toString(),
        name: mealName,
        type,
        time,
        foods,
        totalCalories,
        protein,
        carbs,
        fat,
      });
      return JSON.stringify({ success: true, type, totalCalories, foods: foods.length });
    }

    case 'update_nutrition_targets': {
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
      return JSON.stringify({ success: true, ...targets });
    }

    case 'log_water': {
      const glasses = asNumber(input.glasses);
      if (glasses === null) throw new Error('Missing water intake');
      useNutritionStore.getState().setWaterGlasses(glasses);
      return JSON.stringify({ success: true, glasses });
    }

    case 'update_key_lift': {
      const name = asString(input.name);
      const weight = asNumber(input.weight);
      if (!name || weight === null) throw new Error('Missing key lift fields');
      useProgressStore.getState().updateKeyLift({ name, weight });
      return JSON.stringify({ success: true, name, weight });
    }

    case 'log_body_weight': {
      const weight = asNumber(input.weight);
      if (weight === null) throw new Error('Missing body weight');
      useProgressStore.getState().logBodyWeight(weight);
      return JSON.stringify({ success: true, weight });
    }

    case 'update_profile': {
      useUserStore.getState().updateProfile(input as any);
      return JSON.stringify({ success: true });
    }

    case 'toggle_progressive_overload':
      useUserStore.getState().toggleProgressiveOverload();
      return JSON.stringify({ success: true });

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
      return JSON.stringify({ success: true, id: goal.id, title });
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
      return JSON.stringify({ success: true, id: memory.id, category, content });
    }

    default:
      throw new Error(`Unknown tool: ${tc.name}`);
  }
}
