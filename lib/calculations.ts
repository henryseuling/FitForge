// Workout calculation utilities — 1RM estimation, best set, session stats

import type { CompletedSet, Exercise } from '@/stores/useWorkoutStore';

/**
 * Epley formula: estimated 1RM = weight × (1 + reps / 30)
 * Returns 0 for invalid inputs.
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Find the best working set (highest estimated 1RM) from a list of completed sets.
 * Excludes warmup sets.
 */
export function getBestSet(sets: CompletedSet[]): CompletedSet | null {
  let best: CompletedSet | null = null;
  let bestE1RM = 0;

  for (const set of sets) {
    if (set.isWarmup) continue;
    const e1rm = calculateEstimated1RM(set.weight, set.reps);
    if (e1rm > bestE1RM) {
      bestE1RM = e1rm;
      best = set;
    }
  }

  return best;
}

/**
 * Calculate percent change between current and previous values.
 * Returns null if previous is 0 or undefined.
 */
export function calculatePercentChange(current: number, previous: number | null | undefined): number | null {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/**
 * Format a set as a display string like "135 x 8" or "BW x 12".
 */
export function formatBestSet(set: CompletedSet | null): string | null {
  if (!set) return null;
  const weightStr = set.bodyweight ? 'BW' : set.weight.toString();
  return `${weightStr} x ${set.reps}`;
}

/**
 * Compute aggregate session statistics from exercises.
 */
export interface SessionStats {
  totalWorkingSets: number;
  totalVolume: number;
  volumeByMuscle: Record<string, number>;
  musclesTrained: string[];
}

export function computeSessionStats(exercises: Exercise[]): SessionStats {
  let totalWorkingSets = 0;
  let totalVolume = 0;
  const volumeByMuscle: Record<string, number> = {};

  for (const ex of exercises) {
    for (const set of ex.completedSets) {
      if (set.isWarmup) continue;
      totalWorkingSets++;
      totalVolume += set.weight * set.reps;

      const muscle = ex.muscleGroup || 'Other';
      volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + 1; // count sets per muscle
    }
  }

  return {
    totalWorkingSets,
    totalVolume,
    volumeByMuscle,
    musclesTrained: Object.keys(volumeByMuscle),
  };
}
