export interface WorkoutAgentProfile {
  athleteName: string;
  primaryGoals: string[];
  readinessSummary: string;
  healthSummary: string;
  upcomingFocus: string;
  preferenceSignals: string[];
  constraintSignals: string[];
  progressSignals: string[];
  memorySignals: string[];
}

type AgentCoachContext = {
  memories?: Array<{ category?: string; content?: string; pinned?: boolean }>;
  goals?: Array<{ title?: string }>;
  exerciseProfiles?: Array<{
    exercise_name?: string;
    current_working_weight?: number | null;
    estimated_1rm?: number | null;
    is_favorite?: boolean | null;
    is_disliked?: boolean | null;
    notes?: string | null;
  }>;
  recentObservations?: Array<{ category?: string; observation?: string }>;
  nextSessionPlan?: { split_type?: string | null; coach_notes?: string | null } | null;
  upcomingWorkout?: {
    workoutName?: string;
    splitType?: string;
    exercises?: Array<{ name?: string }>;
  } | null;
};

type AgentAppState = {
  user: {
    name: string;
    trainingSplit: string;
  };
  workout: {
    readinessScore: number;
  };
  progress: {
    keyLifts: Array<{ name: string; weight: number; unit: string; delta: number }>;
  };
  health?: {
    hrv: number | null;
    restingHR: number | null;
    sleepScore: number | null;
    recoveryScore: number | null;
  };
};

type AgentUserContext = {
  userProfile: {
    goals: string[];
    experience: string;
    equipment: string[];
    workoutFrequency: number;
  };
  preferences?: {
    favoriteExercises?: string[];
    dislikedExercises?: string[];
    availableTimePerSession?: number;
  };
  calibration?: {
    exerciseProfiles?: Array<{
      exercise_name?: string;
      current_working_weight?: number | null;
      estimated_1rm?: number | null;
      is_favorite?: boolean | null;
      is_disliked?: boolean | null;
      notes?: string | null;
    }>;
    recentObservations?: Array<{ category?: string; observation?: string }>;
    nextSessionPlan?: { split_type?: string | null; coach_notes?: string | null } | null;
  };
  healthContext?: {
    readinessScore?: number | null;
    hrv?: number | null;
    restingHR?: number | null;
    sleepScore?: number | null;
    recoveryScore?: number | null;
  };
};

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function summarizeReadiness(readinessScore?: number | null, recoveryScore?: number | null): string {
  const effectiveScore = readinessScore ?? recoveryScore ?? null;
  if (effectiveScore == null) return 'No recovery score yet. Coach conservatively until live readiness stabilizes.';
  if (effectiveScore >= 80) return `High readiness (${effectiveScore}/100). Push performance where execution stays crisp.`;
  if (effectiveScore >= 65) return `Moderate readiness (${effectiveScore}/100). Train hard, but bias toward quality over max loading.`;
  if (effectiveScore >= 45) return `Guarded readiness (${effectiveScore}/100). Reduce junk fatigue and keep technique clean.`;
  return `Low readiness (${effectiveScore}/100). Prioritize recovery, movement quality, and minimum effective dose.`;
}

function summarizeHealth(health?: {
  hrv?: number | null;
  restingHR?: number | null;
  sleepScore?: number | null;
  recoveryScore?: number | null;
}): string {
  if (!health) return 'No live health metrics synced.';
  const parts = compact([
    health.hrv != null ? `HRV ${health.hrv} ms` : '',
    health.restingHR != null ? `resting HR ${health.restingHR} bpm` : '',
    health.sleepScore != null ? `sleep ${health.sleepScore}/100` : '',
    health.recoveryScore != null ? `recovery ${health.recoveryScore}/100` : '',
  ]);
  return parts.length > 0 ? parts.join(', ') : 'No live health metrics synced.';
}

function summarizeUpcomingFocus(
  nextSessionPlan?: { split_type?: string | null; coach_notes?: string | null } | null,
  upcomingWorkout?: { workoutName?: string; splitType?: string; exercises?: Array<{ name?: string }> } | null,
  trainingSplit?: string
): string {
  if (upcomingWorkout?.workoutName || upcomingWorkout?.splitType) {
    const topExercises = (upcomingWorkout.exercises || [])
      .map((exercise) => exercise.name?.trim())
      .filter((name): name is string => Boolean(name))
      .slice(0, 3);
    const focus = upcomingWorkout.splitType || upcomingWorkout.workoutName || 'next session';
    return topExercises.length > 0 ? `${focus}: ${topExercises.join(', ')}` : focus;
  }

  if (nextSessionPlan?.split_type) {
    return nextSessionPlan.coach_notes
      ? `${nextSessionPlan.split_type}: ${nextSessionPlan.coach_notes}`
      : nextSessionPlan.split_type;
  }

  return trainingSplit ? `${trainingSplit} split in progress.` : 'No next session drafted yet.';
}

function summarizePreferences(
  exerciseProfiles: Array<{
    exercise_name?: string;
    is_favorite?: boolean | null;
    is_disliked?: boolean | null;
    notes?: string | null;
  }> = [],
  preferences?: {
    favoriteExercises?: string[];
    dislikedExercises?: string[];
    availableTimePerSession?: number;
  }
): { preferenceSignals: string[]; constraintSignals: string[] } {
  const favorites = compact([
    ...(preferences?.favoriteExercises || []),
    ...exerciseProfiles.filter((profile) => profile.is_favorite).map((profile) => profile.exercise_name),
  ]);
  const dislikes = compact([
    ...(preferences?.dislikedExercises || []),
    ...exerciseProfiles.filter((profile) => profile.is_disliked).map((profile) => profile.exercise_name),
  ]);
  const notes = compact(
    exerciseProfiles
      .map((profile) => profile.notes)
      .slice(0, 4)
  );

  return {
    preferenceSignals: compact([
      favorites.length > 0 ? `Favorites: ${Array.from(new Set(favorites)).slice(0, 5).join(', ')}` : '',
      notes.length > 0 ? `Learned exercise notes: ${notes.join(' | ')}` : '',
    ]),
    constraintSignals: compact([
      dislikes.length > 0 ? `Avoid or replace: ${Array.from(new Set(dislikes)).slice(0, 5).join(', ')}` : '',
      preferences?.availableTimePerSession ? `Session cap: ${preferences.availableTimePerSession} minutes` : '',
    ]),
  };
}

function summarizeProgressSignals(
  keyLifts: Array<{ name: string; weight: number; unit: string; delta: number }> = [],
  recentObservations: Array<{ category?: string; observation?: string }> = []
): string[] {
  const liftSignals = keyLifts
    .slice(0, 4)
    .map((lift) => `${lift.name}: ${lift.weight} ${lift.unit} (${lift.delta >= 0 ? '+' : ''}${lift.delta})`);
  const observationSignals = recentObservations
    .slice(0, 4)
    .map((observation) =>
      compact([
        observation.category ? `[${observation.category}]` : '',
        observation.observation || '',
      ]).join(' ')
    );
  return compact([...liftSignals, ...observationSignals]);
}

function summarizeMemorySignals(memories: Array<{ category?: string; content?: string; pinned?: boolean }> = []): string[] {
  return memories
    .filter((memory) => memory.pinned || ['injury', 'constraint', 'preference', 'schedule'].includes((memory.category || '').toLowerCase()))
    .slice(0, 6)
    .map((memory) => compact([memory.category ? `[${memory.category}]` : '', memory.content || '']).join(' '));
}

export function buildWorkoutAgentProfileFromChat(state: AgentAppState, coachContext: AgentCoachContext): WorkoutAgentProfile {
  const { preferenceSignals, constraintSignals } = summarizePreferences(
    coachContext.exerciseProfiles || []
  );
  const liveGoals = compact(coachContext.goals?.map((goal) => goal.title) || []).slice(0, 4);

  return {
    athleteName: state.user.name || 'the athlete',
    primaryGoals: liveGoals.length > 0 ? liveGoals : compact([state.user.trainingSplit]),
    readinessSummary: summarizeReadiness(state.workout.readinessScore, state.health?.recoveryScore),
    healthSummary: summarizeHealth(state.health),
    upcomingFocus: summarizeUpcomingFocus(coachContext.nextSessionPlan, coachContext.upcomingWorkout, state.user.trainingSplit),
    preferenceSignals,
    constraintSignals,
    progressSignals: summarizeProgressSignals(state.progress.keyLifts, coachContext.recentObservations || []),
    memorySignals: summarizeMemorySignals(coachContext.memories || []),
  };
}

export function buildWorkoutAgentProfileFromUserContext(context: AgentUserContext): WorkoutAgentProfile {
  const calibration = context.calibration;
  const { preferenceSignals, constraintSignals } = summarizePreferences(
    calibration?.exerciseProfiles || [],
    context.preferences
  );

  return {
    athleteName: 'the athlete',
    primaryGoals: compact(context.userProfile.goals).slice(0, 4),
    readinessSummary: summarizeReadiness(
      context.healthContext?.readinessScore,
      context.healthContext?.recoveryScore
    ),
    healthSummary: summarizeHealth(context.healthContext),
    upcomingFocus: summarizeUpcomingFocus(
      calibration?.nextSessionPlan || null,
      null,
      `${context.userProfile.workoutFrequency}-day ${context.userProfile.experience} plan`
    ),
    preferenceSignals,
    constraintSignals,
    progressSignals: summarizeProgressSignals([], calibration?.recentObservations || []),
    memorySignals: [],
  };
}

export function formatWorkoutAgentSection(profile: WorkoutAgentProfile): string {
  return `Dedicated athlete agent:
- Athlete: ${profile.athleteName}
- Primary goals: ${profile.primaryGoals.join(', ') || 'General fitness'}
- Readiness: ${profile.readinessSummary}
- Health context: ${profile.healthSummary}
- Upcoming focus: ${profile.upcomingFocus}
- Preferences: ${profile.preferenceSignals.join(' | ') || 'No strong exercise preferences learned yet.'}
- Constraints: ${profile.constraintSignals.join(' | ') || 'No durable constraints recorded.'}
- Progress signals: ${profile.progressSignals.join(' | ') || 'Limited trend data so far.'}
- Durable memory: ${profile.memorySignals.join(' | ') || 'No pinned memories yet.'}`;
}

export function buildWorkoutAgentDirective(
  profile: WorkoutAgentProfile,
  surface: 'chat' | 'planning' | 'analysis' | 'next-session'
): string {
  const common = [
    `You are the dedicated workout intelligence agent for ${profile.athleteName}.`,
    'Reason from this athlete’s real history, preferences, health context, and upcoming training, not generic fitness advice.',
    'Be decisive when the data is strong. If the data is thin or conflicting, say so briefly and ask one precise follow-up.',
  ];

  const surfaceSpecific =
    surface === 'chat'
      ? [
          'Respond like a high-context coach who already knows this athlete.',
          'When the user asks about today, next workout, exercise swaps, loading, recovery, or nutrition around training, tie the answer back to their next session and current readiness.',
          'Prefer concrete instructions, exact next steps, and app actions over generic encouragement.',
        ]
      : surface === 'planning'
        ? [
            'Build programming that evolves from known lift history, recovery signals, time limits, and exercise preferences.',
            'Do not generate a generic split if the profile gives enough information to personalize load, volume, or exercise selection.',
            'Bias toward sustainable progression over novelty.',
          ]
        : surface === 'analysis'
          ? [
              'Explain what the completed session means for performance, recovery, and the next training decision.',
              'Highlight only the most important 2-3 takeaways, not a generic recap.',
            ]
          : [
              'Translate recent performance into the next best session focus.',
              'Name exact lift priorities and concrete load or volume adjustments when the data supports it.',
            ];

  return [...common, ...surfaceSpecific].join('\n');
}
