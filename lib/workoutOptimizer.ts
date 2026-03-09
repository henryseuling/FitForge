import { EXERCISES, type Exercise as ExerciseDefinition, type MuscleGroup, type EquipmentType } from '@/constants/exercises';
import { fetchAIObservations, fetchExerciseProfiles, fetchHealthHistory, fetchProfile, fetchWorkoutHistory } from './api';

type ExerciseProfile = {
  exercise_id?: string | null;
  exercise_name?: string | null;
  current_working_weight?: number | null;
  estimated_1rm?: number | null;
  is_favorite?: boolean | null;
  is_disliked?: boolean | null;
  notes?: string | null;
  total_times_performed?: number | null;
};

type WorkoutHistoryEntry = {
  name?: string;
  split_type?: string | null;
  started_at: string;
  exercises?: Array<{
    name?: string;
    exercise_name?: string;
    muscle_group?: string;
    completed_sets?: Array<{ weight?: number; reps?: number; is_warmup?: boolean }>;
  }>;
};

type HealthSnapshot = {
  readiness_score?: number | null;
  recovery_score?: number | null;
};

type PlannerContext = {
  daysSinceLastWorkout: number | null;
  recentMuscleFatigue: Map<MuscleGroup, number>;
  returningFromLayoff: boolean;
  lastWorkoutName: string;
};

export interface WorkoutOptimizationRequest {
  instruction?: string;
  desiredFocus?: string;
  avoidExercises?: string[];
  preferredExercises?: string[];
  availableTime?: number | null;
  intensity?: 'easy' | 'moderate' | 'hard' | null;
}

export interface OptimizedWorkoutExercise {
  exercise: string;
  sets: number;
  reps: string;
  weight: number;
  exerciseId?: string;
  muscleGroup?: string;
  note?: string;
}

export interface OptimizedWorkoutPlan {
  splitType: string;
  workoutName: string;
  keyLifts: OptimizedWorkoutExercise[];
  adjustments: string[];
  coachNotes: string;
  algorithm: 'fitforge-fitbod-style-v1';
}

const SPLIT_ROTATIONS: Record<string, string[]> = {
  '3-Day Full Body': ['Full Body A', 'Full Body B', 'Full Body C'],
  '4-Day Upper/Lower': ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  '5-Day Rotation': ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  '6-Day PPL': ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
};

const FOCUS_MUSCLES: Record<string, MuscleGroup[]> = {
  'push': ['chest', 'shoulders', 'triceps'],
  'pull': ['back', 'biceps', 'forearms'],
  'legs': ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'upper': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  'lower': ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'],
  'full body': ['chest', 'back', 'quadriceps', 'shoulders', 'core'],
  'chest': ['chest', 'triceps'],
  'back': ['back', 'biceps'],
  'shoulders': ['shoulders', 'triceps'],
  'arms': ['biceps', 'triceps', 'forearms'],
  'recovery': ['core'],
};

const FOCUS_PATTERN_TEMPLATES: Record<string, string[]> = {
  push: ['chest_press', 'shoulder_press', 'chest_isolation', 'shoulder_isolation', 'tricep_isolation'],
  pull: ['row', 'vertical_pull', 'shoulder_isolation', 'curl', 'hinge'],
  legs: ['squat', 'hinge', 'unilateral_leg', 'hamstring_isolation', 'calves', 'core'],
  upper: ['chest_press', 'row', 'vertical_pull', 'shoulder_press', 'shoulder_isolation', 'curl', 'tricep_isolation'],
  lower: ['squat', 'hinge', 'unilateral_leg', 'hamstring_isolation', 'quad_isolation', 'calves', 'core'],
  'full body': ['squat', 'chest_press', 'row', 'hinge', 'vertical_pull', 'core'],
  shoulders: ['shoulder_press', 'shoulder_isolation', 'row', 'tricep_isolation'],
  arms: ['curl', 'tricep_isolation', 'shoulder_isolation'],
};

const EQUIPMENT_ALIASES: Record<string, EquipmentType> = {
  bodyweight: 'bodyweight',
  dumbbell: 'dumbbells',
  dumbbells: 'dumbbells',
  barbell: 'barbell',
  cable: 'cables',
  cables: 'cables',
  machine: 'machines',
  machines: 'machines',
  'pull-up bar': 'pull_up_bar',
  'pull up bar': 'pull_up_bar',
  bands: 'resistance_bands',
  'resistance band': 'resistance_bands',
  'resistance bands': 'resistance_bands',
  kettlebell: 'kettlebell',
  cardio: 'bodyweight',
};

function normalizeEquipment(values: string[] = []): EquipmentType[] {
  return values
    .map((value) => EQUIPMENT_ALIASES[value.trim().toLowerCase()])
    .filter((value): value is EquipmentType => Boolean(value));
}

function normalizeName(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function matchesAny(value: string, options: string[]) {
  const normalized = normalizeName(value);
  return options.some((option) => normalized.includes(normalizeName(option)) || normalizeName(option).includes(normalized));
}

function inferReadiness(healthHistory: HealthSnapshot[]): number {
  const latest = healthHistory[healthHistory.length - 1];
  return latest?.readiness_score ?? latest?.recovery_score ?? 70;
}

function inferGoalMode(goals: string[]) {
  const normalized = goals.map((goal) => goal.toLowerCase());
  if (normalized.some((goal) => goal.includes('strength'))) return 'strength';
  if (normalized.some((goal) => goal.includes('lose') || goal.includes('fat'))) return 'fat_loss';
  if (normalized.some((goal) => goal.includes('muscle') || goal.includes('hypertrophy') || goal.includes('build'))) return 'hypertrophy';
  return 'general';
}

function inferNextFocus(
  trainingSplit: string,
  history: WorkoutHistoryEntry[],
  desiredFocus?: string,
  plannerContext?: PlannerContext,
  readiness = 70
): string {
  if (desiredFocus?.trim()) return desiredFocus.trim();

  if (plannerContext?.returningFromLayoff) {
    return trainingSplit === '3-Day Full Body' ? 'Full Body A' : 'Full Body';
  }

  if (readiness <= 40) {
    return 'Recovery';
  }

  const rotation = SPLIT_ROTATIONS[trainingSplit] || [];
  if (rotation.length > 0) {
    const latestName = normalizeName(history[0]?.name || history[0]?.split_type || '');
    const currentIndex = rotation.findIndex((entry) => normalizeName(entry) === latestName);
    if (currentIndex >= 0) return rotation[(currentIndex + 1) % rotation.length];
    return rotation[0];
  }

  if (trainingSplit?.trim()) return trainingSplit.trim();
  return 'Full Body';
}

function focusToMuscles(focus: string): MuscleGroup[] {
  const normalized = focus.toLowerCase();
  for (const [key, muscles] of Object.entries(FOCUS_MUSCLES)) {
    if (normalized.includes(key)) return muscles;
  }
  return ['chest', 'back', 'quadriceps', 'shoulders'];
}

function focusToPatternTemplate(focus: string): string[] {
  const normalized = focus.toLowerCase();
  for (const [key, patterns] of Object.entries(FOCUS_PATTERN_TEMPLATES)) {
    if (normalized.includes(key)) return patterns;
  }
  return FOCUS_PATTERN_TEMPLATES['full body'];
}

function daysBetween(dateA: string | null | undefined, dateB: Date) {
  if (!dateA) return null;
  const parsed = new Date(dateA);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = dateB.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function inferWorkoutMuscles(workout: WorkoutHistoryEntry): MuscleGroup[] {
  const muscles = new Set<MuscleGroup>();
  for (const exercise of workout.exercises || []) {
    const name = normalizeName(exercise.name || exercise.exercise_name || '');
    const muscle = normalizeName(exercise.muscle_group || '') as MuscleGroup;
    if (muscle) {
      muscles.add(muscle);
      continue;
    }
    muscles.add(inferMuscleGroupFromName(name));
  }
  return Array.from(muscles);
}

function buildPlannerContext(history: WorkoutHistoryEntry[]): PlannerContext {
  const now = new Date();
  const daysSinceLastWorkout = daysBetween(history[0]?.started_at, now);
  const recentMuscleFatigue = new Map<MuscleGroup, number>();

  history.slice(0, 3).forEach((workout, index) => {
    const recencyMultiplier = index === 0 ? 1.6 : index === 1 ? 1.0 : 0.6;
    const daysAgo = daysBetween(workout.started_at, now) ?? 7;
    const freshnessPenalty = daysAgo <= 1 ? 1.3 : daysAgo <= 3 ? 1.0 : 0.5;

    inferWorkoutMuscles(workout).forEach((muscle) => {
      recentMuscleFatigue.set(
        muscle,
        (recentMuscleFatigue.get(muscle) ?? 0) + recencyMultiplier * freshnessPenalty
      );
    });
  });

  return {
    daysSinceLastWorkout,
    recentMuscleFatigue,
    returningFromLayoff: (daysSinceLastWorkout ?? 0) >= 6,
    lastWorkoutName: history[0]?.name || history[0]?.split_type || '',
  };
}

function recentExerciseNames(history: WorkoutHistoryEntry[], limit = 2) {
  return history
    .slice(0, limit)
    .flatMap((workout) => (workout.exercises || []).map((exercise) => exercise.name || exercise.exercise_name || ''))
    .map((name) => normalizeName(name))
    .filter(Boolean);
}

function inferMovementPattern(exercise: ExerciseDefinition): string {
  const name = normalizeName(exercise.name);

  if (/(bench|chest press|push-up|push up|dip)/.test(name)) return 'chest_press';
  if (/(shoulder press|overhead press|arnold press)/.test(name)) return 'shoulder_press';
  if (/(fly|crossover)/.test(name)) return 'chest_isolation';
  if (/(row)/.test(name)) return 'row';
  if (/(pull-up|pull up|pulldown|lat pulldown)/.test(name)) return 'vertical_pull';
  if (/(deadlift|rdl|romanian deadlift|hip thrust)/.test(name)) return 'hinge';
  if (/(squat|leg press|front squat|hack squat)/.test(name)) return 'squat';
  if (/(lunge|split squat|step-up|step up)/.test(name)) return 'unilateral_leg';
  if (/(leg curl)/.test(name)) return 'hamstring_isolation';
  if (/(leg extension)/.test(name)) return 'quad_isolation';
  if (/(curl)/.test(name)) return 'curl';
  if (/(tricep|extension|pushdown|skull crusher)/.test(name)) return 'tricep_isolation';
  if (/(lateral raise|rear delt|face pull)/.test(name)) return 'shoulder_isolation';
  if (/(calf)/.test(name)) return 'calves';
  if (/(plank|crunch|core|ab)/.test(name)) return 'core';
  return `${exercise.primaryMuscle}_${exercise.movementType}`;
}

function inferMovementPatternFromName(name: string): string {
  return inferMovementPattern({
    id: `derived-${normalizeName(name).replace(/[^a-z0-9]+/g, '-')}`,
    name,
    primaryMuscle: inferMuscleGroupFromName(name),
    secondaryMuscles: [],
    equipment: [],
    movementType: /curl|extension|raise|fly|calf|core/i.test(name) ? 'isolation' : 'compound',
    category: 'strength',
    difficulty: 'intermediate',
    instructions: '',
    tips: '',
    defaultSets: 3,
    defaultReps: '8-10',
  });
}

function inferMuscleGroupFromName(name: string): MuscleGroup {
  const normalized = normalizeName(name);
  if (/(bench|chest|fly|dip|push-up|push up)/.test(normalized)) return 'chest';
  if (/(row|pull|lat|back)/.test(normalized)) return 'back';
  if (/(shoulder|overhead press|lateral raise|rear delt|face pull)/.test(normalized)) return 'shoulders';
  if (/(curl|bicep|forearm)/.test(normalized)) return 'biceps';
  if (/(tricep|pushdown|extension|skull crusher)/.test(normalized)) return 'triceps';
  if (/(squat|leg press|quad|lunge|split squat)/.test(normalized)) return 'quadriceps';
  if (/(deadlift|rdl|hamstring|leg curl)/.test(normalized)) return 'hamstrings';
  if (/(hip thrust|glute)/.test(normalized)) return 'glutes';
  if (/(calf)/.test(normalized)) return 'calves';
  if (/(core|ab|crunch|plank)/.test(normalized)) return 'core';
  return 'chest';
}

function buildExerciseScore(params: {
  exercise: ExerciseDefinition;
  profiles: ExerciseProfile[];
  favorites: string[];
  dislikes: string[];
  avoidExercises: string[];
  preferredExercises: string[];
  recentExercises: string[];
  experience: string;
  recentMuscleFatigue: Map<MuscleGroup, number>;
  focus: string;
}) {
  const {
    exercise,
    profiles,
    favorites,
    dislikes,
    avoidExercises,
    preferredExercises,
    recentExercises,
    experience,
    recentMuscleFatigue,
    focus,
  } = params;
  const name = normalizeName(exercise.name);
  const profile = profiles.find((item) => normalizeName(item.exercise_name) === name || normalizeName(item.exercise_id) === normalizeName(exercise.id));

  if (matchesAny(exercise.name, [...dislikes, ...avoidExercises])) return -100;

  let score = 0;
  const fatiguePenalty = recentMuscleFatigue.get(exercise.primaryMuscle) ?? 0;
  score += exercise.movementType === 'compound' ? 6 : 2;
  score += exercise.difficulty === 'beginner' && experience.toLowerCase().includes('beginner') ? 3 : 0;
  score += exercise.difficulty !== 'advanced' && !experience.toLowerCase().includes('advanced') ? 1 : 0;
  score += profile?.current_working_weight || profile?.estimated_1rm ? 4 : 0;
  score += profile?.is_favorite ? 4 : 0;
  score -= profile?.is_disliked ? 8 : 0;
  score += matchesAny(exercise.name, favorites) ? 3 : 0;
  score += matchesAny(exercise.name, preferredExercises) ? 4 : 0;
  score -= recentExercises.includes(name) ? 4 : 0;
  score -= fatiguePenalty >= 2.4 && !normalizeName(focus).includes(exercise.primaryMuscle) ? 4 : 0;
  score -= fatiguePenalty >= 1.4 ? 1 : 0;
  score += profile?.total_times_performed ? Math.min(profile.total_times_performed, 4) : 0;
  return score;
}

function selectExercises(params: {
  focus: string;
  muscles: MuscleGroup[];
  equipment: EquipmentType[];
  profiles: ExerciseProfile[];
  history: WorkoutHistoryEntry[];
  goals: string[];
  experience: string;
  preferredExercises: string[];
  avoidExercises: string[];
  availableTime: number;
  plannerContext: PlannerContext;
}) {
  const recentExercises = recentExerciseNames(params.history, 2);
  const favorites = params.profiles.filter((profile) => profile.is_favorite).map((profile) => profile.exercise_name || '');
  const dislikes = params.profiles.filter((profile) => profile.is_disliked).map((profile) => profile.exercise_name || '');
  const goalMode = inferGoalMode(params.goals);
  const patternTemplate = focusToPatternTemplate(params.focus);

  const pool = EXERCISES
    .filter((exercise) =>
      params.muscles.includes(exercise.primaryMuscle) &&
      (params.equipment.length === 0 || exercise.equipment.some((item) => params.equipment.includes(item)))
    )
    .sort((a, b) =>
      buildExerciseScore({
        exercise: b,
        profiles: params.profiles,
        favorites,
        dislikes,
        avoidExercises: params.avoidExercises,
        preferredExercises: params.preferredExercises,
        recentExercises,
        experience: params.experience,
        recentMuscleFatigue: params.plannerContext.recentMuscleFatigue,
        focus: params.focus,
      }) -
      buildExerciseScore({
        exercise: a,
        profiles: params.profiles,
        favorites,
        dislikes,
        avoidExercises: params.avoidExercises,
        preferredExercises: params.preferredExercises,
        recentExercises,
        experience: params.experience,
        recentMuscleFatigue: params.plannerContext.recentMuscleFatigue,
        focus: params.focus,
      })
    );

  const exerciseCount = params.availableTime <= 35 ? 4 : params.availableTime <= 50 ? 5 : 6;
  const selected: ExerciseDefinition[] = [];
  const covered = new Set<string>();
  const usedPatterns = new Set<string>();

  for (const targetPattern of patternTemplate) {
    if (selected.length >= exerciseCount) break;
    const candidate = pool.find((exercise) => {
      const pattern = inferMovementPattern(exercise);
      return !usedPatterns.has(pattern) && pattern === targetPattern;
    });

    if (candidate) {
      selected.push(candidate);
      covered.add(candidate.primaryMuscle);
      usedPatterns.add(inferMovementPattern(candidate));
    }
  }

  for (const exercise of pool) {
    if (selected.length >= exerciseCount) break;
    const primary = exercise.primaryMuscle;
    const pattern = inferMovementPattern(exercise);
    if (selected.length === 0 && exercise.movementType !== 'compound') continue;
    if (usedPatterns.has(pattern)) continue;

    if (!covered.has(primary) || selected.length < 2 || goalMode === 'strength') {
      selected.push(exercise);
      covered.add(primary);
      usedPatterns.add(pattern);
    } else if (selected.length < exerciseCount && exercise.movementType === 'isolation') {
      selected.push(exercise);
      usedPatterns.add(pattern);
    }
  }

  return selected.slice(0, exerciseCount);
}

function prescriptionForExercise(
  exercise: ExerciseDefinition,
  profile: ExerciseProfile | undefined,
  goalMode: string,
  readiness: number,
  progressiveOverload: boolean,
  intensity: WorkoutOptimizationRequest['intensity'],
  plannerContext: PlannerContext
): OptimizedWorkoutExercise {
  const isCompound = exercise.movementType === 'compound';
  const readinessModifier = readiness >= 80 ? 1.03 : readiness <= 55 ? 0.94 : 1;
  const intensityModifier = intensity === 'hard' ? 1.03 : intensity === 'easy' ? 0.92 : 1;
  const progressionModifier = progressiveOverload ? 1.02 : 1;
  const layoffModifier = plannerContext.returningFromLayoff ? 0.92 : 1;
  const localFatiguePenalty = (plannerContext.recentMuscleFatigue.get(exercise.primaryMuscle) ?? 0) >= 2 ? 0.96 : 1;

  const baseWeight =
    profile?.current_working_weight ??
    (profile?.estimated_1rm ? Math.round(profile.estimated_1rm * (isCompound ? 0.72 : 0.58)) : 0);

  const prescribedWeight = baseWeight > 0
    ? Math.max(0, Math.round(baseWeight * readinessModifier * intensityModifier * progressionModifier * layoffModifier * localFatiguePenalty))
    : 0;
  const baseSets = plannerContext.returningFromLayoff ? (isCompound ? 3 : 2) : isCompound ? 4 : 3;
  const easySets = Math.max(2, baseSets - 1);

  if (goalMode === 'strength') {
    return {
      exercise: exercise.name,
      exerciseId: exercise.id,
      muscleGroup: exercise.primaryMuscle,
      sets: intensity === 'easy' || readiness < 55 ? easySets : baseSets,
      reps: isCompound ? '4-6' : '8-10',
      weight: prescribedWeight,
      note: plannerContext.returningFromLayoff
        ? 'Re-entry strength work. Leave reps in reserve and rebuild rhythm.'
        : isCompound ? 'Primary strength lift' : 'Accessory strength support',
    };
  }

  if (goalMode === 'fat_loss') {
    return {
      exercise: exercise.name,
      exerciseId: exercise.id,
      muscleGroup: exercise.primaryMuscle,
      sets: intensity === 'easy' || readiness < 55 ? 2 : 3,
      reps: isCompound ? '8-10' : '12-15',
      weight: prescribedWeight,
      note: 'Keep rest short and move with intent',
    };
  }

  return {
    exercise: exercise.name,
    exerciseId: exercise.id,
    muscleGroup: exercise.primaryMuscle,
    sets: intensity === 'easy' || readiness < 55 ? easySets : baseSets,
    reps: isCompound ? '6-8' : '10-12',
    weight: prescribedWeight,
    note: plannerContext.returningFromLayoff
      ? 'Re-entry volume. Crisp reps, conservative loading, no grinders.'
      : isCompound ? 'Use a controlled top set and back-off quality' : 'Chase clean volume',
  };
}

export async function generateOptimizedWorkoutPlan(request: WorkoutOptimizationRequest = {}): Promise<OptimizedWorkoutPlan> {
  const [profile, exerciseProfiles, workoutHistory, observations, healthHistory] = await Promise.all([
    fetchProfile().catch(() => null),
    fetchExerciseProfiles().catch(() => []),
    fetchWorkoutHistory(12).catch(() => []),
    fetchAIObservations(8).catch(() => []),
    fetchHealthHistory(7).catch(() => []),
  ]);

  const userProfile = profile || {};
  const goals = Array.isArray(userProfile.goals) ? userProfile.goals : [];
  const equipment = normalizeEquipment(Array.isArray(userProfile.equipment) ? userProfile.equipment : []);
  const trainingSplit = String(userProfile.training_split || userProfile.trainingSplit || '');
  const experience = String(userProfile.level || 'intermediate');
  const progressiveOverload = userProfile.progressive_overload ?? userProfile.progressiveOverload ?? true;
  const availableTime = request.availableTime ?? userProfile.session_duration ?? userProfile.sessionDuration ?? 60;
  const plannerContext = buildPlannerContext(workoutHistory as WorkoutHistoryEntry[]);
  const readiness = inferReadiness(healthHistory as HealthSnapshot[]);

  const focus = inferNextFocus(
    trainingSplit,
    workoutHistory as WorkoutHistoryEntry[],
    request.desiredFocus,
    plannerContext,
    readiness
  );
  const muscles = focusToMuscles(focus);
  const selectedExercises = selectExercises({
    focus,
    muscles,
    equipment,
    profiles: exerciseProfiles as ExerciseProfile[],
    history: workoutHistory as WorkoutHistoryEntry[],
    goals,
    experience,
    preferredExercises: request.preferredExercises || [],
    avoidExercises: request.avoidExercises || [],
    availableTime,
    plannerContext,
  });

  const goalMode = inferGoalMode(goals);
  const keyLifts = selectedExercises.map((exercise) =>
    prescriptionForExercise(
      exercise,
      (exerciseProfiles as ExerciseProfile[]).find(
        (profileItem) =>
          normalizeName(profileItem.exercise_name) === normalizeName(exercise.name) ||
          normalizeName(profileItem.exercise_id) === normalizeName(exercise.id)
      ),
      goalMode,
      readiness,
      !!progressiveOverload,
      request.intensity ?? null,
      plannerContext
    )
  );

  const observationSignals = (observations as Array<{ category?: string; observation?: string }>)
    .slice(0, 3)
    .map((observation) => observation.observation)
    .filter(Boolean) as string[];

  const splitTemplate = focusToPatternTemplate(focus);
  const selectedPatterns = keyLifts.map((lift) => inferMovementPatternFromName(lift.exercise));

  return {
    splitType: focus,
    workoutName: focus,
    keyLifts,
    adjustments: [
      `Optimized around ${focus.toLowerCase()} with a ${availableTime}-minute session cap.`,
      `Template emphasis: ${splitTemplate.slice(0, keyLifts.length <= 4 ? 3 : 4).join(', ')}.`,
      plannerContext.returningFromLayoff
        ? `Returning after ${plannerContext.daysSinceLastWorkout} days off, so volume and loading were tapered.`
        : plannerContext.daysSinceLastWorkout != null
          ? `Last session was ${plannerContext.daysSinceLastWorkout} day${plannerContext.daysSinceLastWorkout === 1 ? '' : 's'} ago (${plannerContext.lastWorkoutName || 'recent workout'}).`
          : '',
      readiness < 60 ? 'Readiness is suppressed, so loading was moderated to prioritize quality.' : 'Readiness supports a normal progression target today.',
      selectedPatterns.length > 0 ? `Selected movement patterns: ${selectedPatterns.slice(0, 5).join(', ')}.` : '',
      ...observationSignals.slice(0, 2),
      ...(request.instruction ? [`User request applied: ${request.instruction}`] : []),
    ].slice(0, 4),
    coachNotes:
      plannerContext.returningFromLayoff
        ? `This is a re-entry ${focus.toLowerCase()} session. Keep everything clean, stop before grinders, and treat it as calibration for the next harder day.`
        : readiness < 60
        ? `This is a lower-fatigue ${focus.toLowerCase()} session. Keep 1-2 reps in reserve on compounds and move efficiently through accessories.`
        : `This ${focus.toLowerCase()} session pushes your highest-value lifts first, then uses accessories to round out volume without wasting time.`,
    algorithm: 'fitforge-fitbod-style-v1',
  };
}
