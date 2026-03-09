/**
 * goalEngine.ts — Deterministic goal evaluation engine.
 *
 * Maintains 3 auto-goals (short / medium / long horizon) and keeps
 * current_value up-to-date on ALL goals from real workout/nutrition data.
 * No AI calls — pure heuristics.
 */

import { useProgressStore, type KeyLift, type WorkoutHistoryEntry } from '@/stores/useProgressStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useUserStore } from '@/stores/useUserStore';
import {
  fetchActiveGoals,
  createGoal,
  updateGoalProgress,
  completeGoal,
  deleteGoal,
} from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalHorizon = 'short' | 'medium' | 'long';

interface DbGoal {
  id: string;
  type: string;
  title: string;
  current_value: number;
  target_value: number;
  unit: string;
  deadline?: string;
  horizon: GoalHorizon;
  auto: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface GoalSeed {
  type: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline?: string;
  horizon: GoalHorizon;
  auto: boolean;
}

interface EvalContext {
  workoutHistory: WorkoutHistoryEntry[];
  keyLifts: KeyLift[];
  weight: number;
  streak: number;
  totalWorkouts: number;
  proteinTarget: number;
  totalProtein: number;
  calorieTarget: number;
  totalCalories: number;
  frequency: number;
  level: string;
  profileGoals: string[]; // e.g. ["Build Muscle", "Lose Weight"]
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

let _lastEvalTs = 0;
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function canEvaluateGoals(): boolean {
  return Date.now() - _lastEvalTs >= COOLDOWN_MS;
}

export function resetEvalCooldown(): void {
  _lastEvalTs = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d;
}

function monthStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function quarterStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - 3);
  return d;
}

function addWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function workoutsSince(history: WorkoutHistoryEntry[], since: Date): number {
  return history.filter(
    (w) => w.completed_at && new Date(w.started_at) >= since
  ).length;
}

function daysSinceLastWorkout(history: WorkoutHistoryEntry[]): number {
  const last = history.find((w) => w.completed_at);
  if (!last) return Infinity;
  return Math.floor((Date.now() - new Date(last.started_at).getTime()) / (1000 * 60 * 60 * 24));
}

function weakestLift(lifts: KeyLift[]): KeyLift | null {
  if (lifts.length === 0) return null;
  return lifts.reduce((min, l) => (l.weight < min.weight ? l : min), lifts[0]);
}

function strongestLift(lifts: KeyLift[]): KeyLift | null {
  if (lifts.length === 0) return null;
  return lifts.reduce((max, l) => (l.weight > max.weight ? l : max), lifts[0]);
}

function profileWantsWeightLoss(goals: string[]): boolean {
  return goals.some((g) => /lose|cut|lean|fat loss/i.test(g));
}

function profileWantsMuscle(goals: string[]): boolean {
  return goals.some((g) => /muscle|bulk|gain|mass|hypertrophy|strength/i.test(g));
}

// ---------------------------------------------------------------------------
// Context builder — reads from Zustand stores (already hydrated)
// ---------------------------------------------------------------------------

function buildEvalContext(): EvalContext {
  const progress = useProgressStore.getState();
  const nutrition = useNutritionStore.getState();
  const user = useUserStore.getState();

  return {
    workoutHistory: progress.workoutHistory,
    keyLifts: progress.keyLifts,
    weight: progress.weight || user.weight,
    streak: progress.streak,
    totalWorkouts: progress.workoutHistory.filter((w) => w.completed_at).length,
    proteinTarget: nutrition.proteinTarget,
    totalProtein: nutrition.totalProtein(),
    calorieTarget: nutrition.calorieTarget,
    totalCalories: nutrition.totalCalories(),
    frequency: user.frequency || 3,
    level: user.level,
    profileGoals: user.goals || [],
  };
}

// ---------------------------------------------------------------------------
// Progress updaters (by goal type)
// ---------------------------------------------------------------------------

function computeCurrentValue(goal: DbGoal, ctx: EvalContext): number | null {
  switch (goal.type) {
    case 'weight':
      return ctx.weight > 0 ? roundTo(ctx.weight, 1) : null;

    case 'strength': {
      const lift = ctx.keyLifts.find((l) =>
        goal.title.toLowerCase().includes(l.name.toLowerCase())
      );
      return lift ? lift.weight : null;
    }

    case 'frequency': {
      const cutoff =
        goal.horizon === 'short'
          ? weekStart()
          : goal.horizon === 'medium'
          ? monthStart()
          : quarterStart();
      return workoutsSince(ctx.workoutHistory, cutoff);
    }

    case 'nutrition': {
      if (/protein/i.test(goal.title)) return roundTo(ctx.totalProtein, 1);
      if (/calorie/i.test(goal.title)) return roundTo(ctx.totalCalories, 50);
      return null;
    }

    case 'habit': {
      // For habit goals, use streak or frequency count depending on title
      if (/workout|gym|train/i.test(goal.title)) {
        const cutoff = weekStart();
        return workoutsSince(ctx.workoutHistory, cutoff);
      }
      if (/protein/i.test(goal.title)) {
        // Approximate: are we hitting target today?
        return ctx.totalProtein >= ctx.proteinTarget ? 1 : 0;
      }
      return ctx.streak;
    }

    default:
      return null;
  }
}

function isGoalReached(goal: DbGoal): boolean {
  if (goal.target_value === 0) return false;

  // Weight loss: target < current at creation, reached when current <= target
  if (goal.type === 'weight' && goal.target_value < goal.current_value) {
    return goal.current_value <= goal.target_value;
  }

  return goal.current_value >= goal.target_value;
}

// ---------------------------------------------------------------------------
// Auto-goal generators
// ---------------------------------------------------------------------------

function generateShortGoal(ctx: EvalContext, existing: DbGoal[]): GoalSeed | null {
  const existingTitles = existing.map((g) => g.title.toLowerCase());
  const daysSince = daysSinceLastWorkout(ctx.workoutHistory);
  const thisWeekCount = workoutsSince(ctx.workoutHistory, weekStart());

  // Brand new user
  if (ctx.totalWorkouts === 0) {
    return {
      type: 'frequency',
      title: 'Complete your first 3 workouts',
      target_value: 3,
      current_value: 0,
      unit: 'workouts',
      deadline: addWeeks(2),
      horizon: 'short',
      auto: true,
    };
  }

  // Hasn't worked out in 7+ days — get back in
  if (daysSince >= 7 && !existingTitles.some((t) => t.includes('get back'))) {
    return {
      type: 'frequency',
      title: 'Get back in the gym: 3 workouts this week',
      target_value: 3,
      current_value: thisWeekCount,
      unit: 'workouts',
      deadline: addWeeks(1),
      horizon: 'short',
      auto: true,
    };
  }

  // Missing protein targets
  if (
    ctx.proteinTarget > 0 &&
    ctx.totalProtein < ctx.proteinTarget * 0.8 &&
    !existingTitles.some((t) => t.includes('protein'))
  ) {
    return {
      type: 'habit',
      title: 'Hit daily protein target 5 out of 7 days',
      target_value: 5,
      current_value: 0,
      unit: 'days',
      deadline: addWeeks(1),
      horizon: 'short',
      auto: true,
    };
  }

  // Default: hit your frequency this week
  const weeklyTarget = Math.min(ctx.frequency, 6);
  return {
    type: 'frequency',
    title: `Complete ${weeklyTarget} workouts this week`,
    target_value: weeklyTarget,
    current_value: thisWeekCount,
    unit: 'workouts',
    deadline: addWeeks(1),
    horizon: 'short',
    auto: true,
  };
}

function generateMediumGoal(ctx: EvalContext, existing: DbGoal[]): GoalSeed | null {
  const existingTitles = existing.map((g) => g.title.toLowerCase());

  // Brand new user
  if (ctx.totalWorkouts < 4) {
    return {
      type: 'frequency',
      title: 'Work out consistently for 4 weeks',
      target_value: ctx.frequency * 4,
      current_value: ctx.totalWorkouts,
      unit: 'workouts',
      deadline: addMonths(1),
      horizon: 'medium',
      auto: true,
    };
  }

  // Has key lifts — target weakest lift improvement
  const weak = weakestLift(ctx.keyLifts);
  if (weak && !existingTitles.some((t) => t.includes(weak.name.toLowerCase()))) {
    const increment = roundTo(Math.max(10, weak.weight * 0.05), 5);
    return {
      type: 'strength',
      title: `Add ${increment}lbs to ${weak.name}`,
      target_value: roundTo(weak.weight + increment, 5),
      current_value: weak.weight,
      unit: 'lbs',
      deadline: addWeeks(6),
      horizon: 'medium',
      auto: true,
    };
  }

  // Weight-based goal from profile
  if (profileWantsWeightLoss(ctx.profileGoals) && ctx.weight > 0) {
    return {
      type: 'weight',
      title: `Lose 5lbs in 8 weeks`,
      target_value: roundTo(ctx.weight - 5, 1),
      current_value: roundTo(ctx.weight, 1),
      unit: 'lbs',
      deadline: addWeeks(8),
      horizon: 'medium',
      auto: true,
    };
  }

  // Default: monthly frequency
  const monthTarget = ctx.frequency * 4;
  return {
    type: 'frequency',
    title: `Complete ${monthTarget} workouts this month`,
    target_value: monthTarget,
    current_value: workoutsSince(ctx.workoutHistory, monthStart()),
    unit: 'workouts',
    deadline: addMonths(1),
    horizon: 'medium',
    auto: true,
  };
}

function generateLongGoal(ctx: EvalContext, existing: DbGoal[]): GoalSeed | null {
  const existingTitles = existing.map((g) => g.title.toLowerCase());

  // Brand new user — based on profile goal
  if (ctx.totalWorkouts < 4) {
    if (profileWantsWeightLoss(ctx.profileGoals) && ctx.weight > 0) {
      return {
        type: 'weight',
        title: `Reach ${roundTo(ctx.weight - 20, 5)}lbs`,
        target_value: roundTo(ctx.weight - 20, 5),
        current_value: roundTo(ctx.weight, 1),
        unit: 'lbs',
        deadline: addMonths(6),
        horizon: 'long',
        auto: true,
      };
    }
    return {
      type: 'frequency',
      title: 'Complete 50 total workouts',
      target_value: 50,
      current_value: ctx.totalWorkouts,
      unit: 'workouts',
      deadline: addMonths(6),
      horizon: 'long',
      auto: true,
    };
  }

  // Strength milestone on strongest lift
  const strong = strongestLift(ctx.keyLifts);
  if (strong && !existingTitles.some((t) => t.includes(strong.name.toLowerCase()))) {
    const increment = roundTo(Math.max(25, strong.weight * 0.15), 5);
    return {
      type: 'strength',
      title: `Add ${increment}lbs to ${strong.name}`,
      target_value: roundTo(strong.weight + increment, 5),
      current_value: strong.weight,
      unit: 'lbs',
      deadline: addMonths(4),
      horizon: 'long',
      auto: true,
    };
  }

  // Volume milestone
  if (!existingTitles.some((t) => t.includes('total workouts'))) {
    const nextMilestone = roundTo(ctx.totalWorkouts + 50, 50);
    return {
      type: 'frequency',
      title: `Complete ${nextMilestone} total workouts`,
      target_value: nextMilestone,
      current_value: ctx.totalWorkouts,
      unit: 'workouts',
      deadline: addMonths(6),
      horizon: 'long',
      auto: true,
    };
  }

  // Weight goal fallback
  if (profileWantsWeightLoss(ctx.profileGoals) && ctx.weight > 0) {
    return {
      type: 'weight',
      title: `Reach ${roundTo(ctx.weight - 20, 5)}lbs`,
      target_value: roundTo(ctx.weight - 20, 5),
      current_value: roundTo(ctx.weight, 1),
      unit: 'lbs',
      deadline: addMonths(6),
      horizon: 'long',
      auto: true,
    };
  }

  if (profileWantsMuscle(ctx.profileGoals) && ctx.weight > 0) {
    return {
      type: 'weight',
      title: `Reach ${roundTo(ctx.weight + 10, 5)}lbs`,
      target_value: roundTo(ctx.weight + 10, 5),
      current_value: roundTo(ctx.weight, 1),
      unit: 'lbs',
      deadline: addMonths(6),
      horizon: 'long',
      auto: true,
    };
  }

  return null;
}

const GENERATORS: Record<GoalHorizon, (ctx: EvalContext, existing: DbGoal[]) => GoalSeed | null> = {
  short: generateShortGoal,
  medium: generateMediumGoal,
  long: generateLongGoal,
};

// ---------------------------------------------------------------------------
// Stale detection
// ---------------------------------------------------------------------------

function isStaleAutoGoal(goal: DbGoal): boolean {
  if (!goal.auto || !goal.updated_at) return false;
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const lastUpdate = new Date(goal.updated_at).getTime();
  // Also check if deadline has passed
  if (goal.deadline && new Date(goal.deadline).getTime() < Date.now()) return true;
  return lastUpdate < twoWeeksAgo;
}

// ---------------------------------------------------------------------------
// Main evaluation
// ---------------------------------------------------------------------------

export async function evaluateAndUpdateGoals(): Promise<DbGoal[] | null> {
  if (!canEvaluateGoals()) return null;
  _lastEvalTs = Date.now();

  try {
    const ctx = buildEvalContext();

    // Need minimum data to do anything useful
    if (ctx.weight <= 0 && ctx.totalWorkouts === 0 && ctx.keyLifts.length === 0) {
      return null;
    }

    const allGoals = await fetchActiveGoals();

    // 1. Update current_value on all goals
    for (const goal of allGoals) {
      const newVal = computeCurrentValue(goal as DbGoal, ctx);
      if (newVal !== null && newVal !== goal.current_value) {
        await updateGoalProgress(goal.id, newVal).catch(() => {});
      }
    }

    // 2. Complete goals that reached their target
    for (const goal of allGoals) {
      // Re-read the potentially updated value
      const g = goal as DbGoal;
      const updatedVal = computeCurrentValue(g, ctx);
      if (updatedVal !== null) g.current_value = updatedVal;

      if (isGoalReached(g)) {
        await completeGoal(g.id).catch(() => {});
      }
    }

    // 3. Get remaining active auto-goals after completions
    const remaining = await fetchActiveGoals();
    const autoGoals = remaining.filter((g: any) => g.auto) as DbGoal[];

    // 4. Replace stale auto-goals
    for (const goal of autoGoals) {
      if (isStaleAutoGoal(goal)) {
        await deleteGoal(goal.id).catch(() => {});
      }
    }

    // 5. Ensure one auto-goal per horizon
    const freshGoals = await fetchActiveGoals();
    const freshAuto = freshGoals.filter((g: any) => g.auto) as DbGoal[];

    for (const horizon of ['short', 'medium', 'long'] as GoalHorizon[]) {
      const hasHorizon = freshAuto.some((g) => g.horizon === horizon);
      if (!hasHorizon) {
        const seed = GENERATORS[horizon](ctx, freshAuto);
        if (seed) {
          await createGoal(seed).catch(() => {});
        }
      }
    }

    return await fetchActiveGoals();
  } catch {
    return null;
  }
}
