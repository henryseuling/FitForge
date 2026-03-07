import {
  fetchAIObservations,
  fetchCoachMemories,
  fetchExerciseProfiles,
  fetchGoals,
  fetchNextSessionPlan,
} from './api';

export interface CoachContext {
  memories: Array<{
    id: string;
    category: string;
    content: string;
    source: string;
    pinned: boolean;
  }>;
  goals: Array<{
    id: string;
    title: string;
    current_value: number;
    target_value: number;
    unit: string;
    type: string;
  }>;
  exerciseProfiles: Array<{
    exercise_name: string;
    current_working_weight?: number | null;
    estimated_1rm?: number | null;
    is_favorite?: boolean | null;
    is_disliked?: boolean | null;
    notes?: string | null;
  }>;
  recentObservations: Array<{
    category: string;
    observation: string;
  }>;
  nextSessionPlan: {
    split_type?: string | null;
    key_lifts?: unknown;
    adjustments?: unknown;
    coach_notes?: string | null;
  } | null;
}

export async function buildCoachContext(): Promise<CoachContext> {
  const [memories, goals, exerciseProfiles, recentObservations, nextSessionPlan] = await Promise.all([
    fetchCoachMemories(8).catch(() => []),
    fetchGoals().catch(() => []),
    fetchExerciseProfiles().catch(() => []),
    fetchAIObservations(6).catch(() => []),
    fetchNextSessionPlan().catch(() => null),
  ]);

  return {
    memories: memories.map((memory: any) => ({
      id: memory.id,
      category: memory.category || 'general',
      content: memory.content || '',
      source: memory.source || 'unknown',
      pinned: !!memory.pinned,
    })),
    goals: goals.map((goal: any) => ({
      id: goal.id,
      title: goal.title || '',
      current_value: goal.current_value || 0,
      target_value: goal.target_value || 0,
      unit: goal.unit || '',
      type: goal.type || 'goal',
    })),
    exerciseProfiles: exerciseProfiles
      .filter((profile: any) => profile.exercise_name)
      .sort((a: any, b: any) => Number(!!b.is_favorite) - Number(!!a.is_favorite))
      .slice(0, 8)
      .map((profile: any) => ({
        exercise_name: profile.exercise_name,
        current_working_weight: profile.current_working_weight,
        estimated_1rm: profile.estimated_1rm,
        is_favorite: profile.is_favorite,
        is_disliked: profile.is_disliked,
        notes: profile.notes,
      })),
    recentObservations: recentObservations.map((observation: any) => ({
      category: observation.category || 'recommendation',
      observation: observation.observation || '',
    })),
    nextSessionPlan: nextSessionPlan
      ? {
          split_type: nextSessionPlan.split_type,
          key_lifts: nextSessionPlan.key_lifts,
          adjustments: nextSessionPlan.adjustments,
          coach_notes: nextSessionPlan.coach_notes,
        }
      : null,
  };
}
