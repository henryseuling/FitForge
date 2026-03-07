// AI-powered workout engine — all workout intelligence through Claude API
// Handles plan generation, mid-workout adjustments, post-workout analysis,
// exercise swaps, and AI meal suggestions.

import { getExercisesByEquipment } from '@/constants/exercises';
import { invokeCompletionAI } from './aiGateway';
import { extractJsonPayload } from './json';
import type { Exercise, MuscleGroup, EquipmentType } from '@/constants/exercises';

// ── Types ────────────────────────────────────────────────────────

export interface WorkoutPlan {
  weekNumber: number;
  periodizationPhase: 'accumulation' | 'intensification' | 'deload';
  weeklySchedule: Record<string, WorkoutDay | RestDay>;
  coachNotes: string;
}

export interface WorkoutDay {
  type: 'workout';
  name: string;
  focusMuscles: string[];
  estimatedDuration: number;
  warmup: string;
  exercises: PlannedExercise[];
  finisher: string | null;
}

export interface RestDay {
  type: 'rest';
  recommendation: string;
}

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  suggestedWeight: number | null;
  rpe: number;
  tempo: string | null;
  notes: string | null;
  supersetWith: string | null;
}

export interface UserContext {
  userProfile: {
    goals: string[];
    experience: string;
    equipment: string[];
    age: number;
    gender: string;
    height: string;
    weight: number;
    workoutFrequency: number;
  };
  workoutHistory?: any[];
  progressData?: any;
  previousPlan?: any;
  preferences?: {
    favoriteExercises?: string[];
    dislikedExercises?: string[];
    availableTimePerSession?: number;
  };
  calibration?: {
    exerciseProfiles?: any[];
    recentObservations?: any[];
    nextSessionPlan?: any;
  };
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Call the Claude API with a system prompt and user message.
 * Returns the raw text content from the response.
 */
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096
): Promise<string> {
  const { text } = await invokeCompletionAI({
    systemPrompt,
    userMessage,
    maxTokens,
  });
  return text;
}

/**
 * Build a compact exercise database string for the prompt.
 */
function buildExerciseDatabase(equipment: string[]): string {
  const exercises = getExercisesByEquipment(equipment as EquipmentType[]);
  return exercises
    .map(
      (ex) =>
        `- ${ex.id}: ${ex.name} | ${ex.primaryMuscle} (${ex.secondaryMuscles.join(', ')}) | ${ex.equipment} | ${ex.movementType} | ${ex.difficulty} | ${ex.defaultSets}x${ex.defaultReps}`
    )
    .join('\n');
}

// ── Day names helper ─────────────────────────────────────────────

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ── A. Generate Workout Plan ─────────────────────────────────────

const WORKOUT_GENERATION_SYSTEM_PROMPT = `You are an elite strength and conditioning coach with deep expertise in exercise science, periodization, and program design. Your role is to generate a complete, individualized weekly workout plan.

PROGRAMMING PRINCIPLES:

1. PERIODIZATION
   - Use a block periodization model with three phases:
     * Accumulation (weeks 1-3): Higher volume, moderate intensity (RPE 6-8). Focus on hypertrophy and work capacity. Sets of 8-15 reps for most exercises.
     * Intensification (weeks 4-6): Moderate volume, higher intensity (RPE 7-9). Focus on strength. Sets of 4-8 reps for compounds, 8-12 for accessories.
     * Deload (week 7): Reduced volume AND intensity (RPE 5-6). 50-60% of normal volume. Active recovery focus.
   - Each week should have a clear phase designation.

2. PROGRESSIVE OVERLOAD
   - Suggest specific weights when user history is available.
   - When no history exists, use conservative starting weights based on experience level.
   - Progress mechanisms: increase weight, increase reps within range, increase sets, decrease rest, improve tempo control.

3. EXERCISE SELECTION RULES
   - Every workout must start with a compound movement.
   - Pair opposing muscle groups in supersets when time-efficient (e.g., chest/back, biceps/triceps).
   - Include at least one unilateral exercise per session to address imbalances.
   - Never program the same movement pattern on consecutive days.
   - Respect equipment availability — only use exercises the user has equipment for.
   - Honor exercise preferences: prioritize favorites, avoid disliked exercises.

4. RECOVERY & FREQUENCY
   - Each muscle group needs 48-72 hours between direct training sessions.
   - Larger muscle groups (legs, back) need more recovery than smaller ones (arms, calves).
   - Schedule rest days strategically — never more than 3 consecutive training days for beginners, 4 for advanced.
   - Include active recovery recommendations on rest days.

5. GOAL-SPECIFIC PROGRAMMING
   - Muscle Building: Higher volume (15-25 sets/muscle group/week), moderate intensity, metabolic stress techniques.
   - Strength: Lower volume, higher intensity, longer rest periods, emphasis on compound lifts.
   - Fat Loss: Moderate volume with shorter rest periods, include metabolic finishers, full-body or upper/lower splits preferred.
   - General Fitness: Balanced approach, variety in rep ranges, include conditioning work.
   - Athletic Performance: Power development, plyometrics, sport-specific movement patterns.

6. SESSION STRUCTURE
   - Warmup: 5-10 minutes of dynamic movement prep specific to the day's focus.
   - Main lifts: 2-3 compound exercises (heaviest first).
   - Accessory work: 3-5 isolation/machine exercises.
   - Finisher (optional): Brief metabolic conditioning or targeted pump work.
   - Each session should be completable within the user's time constraints.

7. TEMPO & REST PRESCRIPTIONS
   - Provide tempo notation (eccentric-pause-concentric-pause) for key exercises.
   - Rest periods: 2-3 min for heavy compounds, 60-90s for accessories, 30-45s for isolation.
   - Supersets share rest periods — rest after both exercises.

8. RPE GUIDELINES
   - RPE 6: Could do 4 more reps (warmup weight, technique focus)
   - RPE 7: Could do 3 more reps (moderate effort)
   - RPE 8: Could do 2 more reps (challenging, standard working sets)
   - RPE 9: Could do 1 more rep (near max effort)
   - RPE 10: Maximum effort (rarely prescribed, only for testing)

RESPONSE FORMAT:
You MUST respond with a single JSON object matching this exact schema. No additional text before or after the JSON.

{
  "weekNumber": <number>,
  "periodizationPhase": "accumulation" | "intensification" | "deload",
  "weeklySchedule": {
    "monday": { "type": "workout", "name": "...", "focusMuscles": [...], "estimatedDuration": <minutes>, "warmup": "...", "exercises": [...], "finisher": "..." | null },
    "tuesday": { "type": "rest", "recommendation": "..." },
    ...
  },
  "coachNotes": "..."
}

Each exercise in the exercises array must have:
{
  "exerciseId": "<id from the database>",
  "exerciseName": "<name>",
  "sets": <number>,
  "reps": "<string like '8-10' or '12'>",
  "restSeconds": <number>,
  "suggestedWeight": <number in lbs or null>,
  "rpe": <number 6-10>,
  "tempo": "<string like '3-1-1-0' or null>",
  "notes": "<string or null>",
  "supersetWith": "<exerciseId or null>"
}

IMPORTANT: Only use exercise IDs from the provided exercise database. All 7 days of the week must be present in weeklySchedule.`;

export async function generateWorkoutPlan(context: UserContext): Promise<WorkoutPlan> {
  try {
    const { userProfile, workoutHistory, progressData, previousPlan, preferences } = context;
    const exerciseDB = buildExerciseDatabase(userProfile.equipment);

    // Determine week number and phase
    let weekNumber = 1;
    let phase: 'accumulation' | 'intensification' | 'deload' = 'accumulation';
    if (previousPlan) {
      weekNumber = (previousPlan.weekNumber || 0) + 1;
      if (weekNumber <= 3) phase = 'accumulation';
      else if (weekNumber <= 6) phase = 'intensification';
      else {
        phase = 'deload';
        if (weekNumber > 7) weekNumber = 1; // Reset cycle
      }
    }

    const calibration = context.calibration;
    const exerciseProfilesSummary = calibration?.exerciseProfiles?.length
      ? `\nEXERCISE PROFILES (known working weights and 1RMs):\n${calibration.exerciseProfiles
          .filter((p: any) => p.current_working_weight || p.estimated_1rm)
          .slice(0, 20)
          .map((p: any) => `- ${p.exercise_name}: working ${p.current_working_weight || '?'}lb, 1RM ${p.estimated_1rm || '?'}lb`)
          .join('\n')}`
      : '';

    const observationsSummary = calibration?.recentObservations?.length
      ? `\nRECENT AI OBSERVATIONS:\n${calibration.recentObservations.slice(0, 5).map((o: any) => `- [${o.category}] ${o.observation}`).join('\n')}`
      : '';

    const nextPlanSummary = calibration?.nextSessionPlan
      ? `\nNEXT SESSION RECOMMENDATION:\n- Focus: ${calibration.nextSessionPlan.split_type || calibration.nextSessionPlan.splitType || ''}\n- Notes: ${calibration.nextSessionPlan.coach_notes || calibration.nextSessionPlan.coachNotes || ''}`
      : '';

    const userMessage = `Generate a week ${weekNumber} (${phase} phase) workout plan for this user:

PROFILE:
- Age: ${userProfile.age}, Gender: ${userProfile.gender}
- Height: ${userProfile.height}, Weight: ${userProfile.weight} lbs
- Experience Level: ${userProfile.experience}
- Goals: ${userProfile.goals.join(', ')}
- Available Equipment: ${userProfile.equipment.join(', ')}
- Workout Frequency: ${userProfile.workoutFrequency} days/week
${preferences?.availableTimePerSession ? `- Available Time Per Session: ${preferences.availableTimePerSession} minutes` : ''}
${preferences?.favoriteExercises?.length ? `- Favorite Exercises: ${preferences.favoriteExercises.join(', ')}` : ''}
${preferences?.dislikedExercises?.length ? `- Exercises to Avoid: ${preferences.dislikedExercises.join(', ')}` : ''}

${workoutHistory?.length ? `RECENT WORKOUT HISTORY (last ${Math.min(workoutHistory.length, 5)} sessions):\n${JSON.stringify(workoutHistory.slice(-5), null, 2)}` : 'No workout history available — use conservative starting weights.'}

${progressData ? `PROGRESS DATA:\n${JSON.stringify(progressData, null, 2)}` : ''}
${exerciseProfilesSummary}
${observationsSummary}
${nextPlanSummary}

AVAILABLE EXERCISE DATABASE:
${exerciseDB}

Generate the complete weekly plan now. Remember: exactly ${userProfile.workoutFrequency} workout days and ${7 - userProfile.workoutFrequency} rest days. Use the exercise profiles to set accurate suggested weights.`;

    const responseText = await callClaude(WORKOUT_GENERATION_SYSTEM_PROMPT, userMessage, 4096);
    const plan = extractJsonPayload<WorkoutPlan>(responseText);

    // Validate the plan has the required structure
    if (!plan.weeklySchedule || !plan.periodizationPhase) {
      throw new Error('Invalid plan structure returned from API');
    }

    return plan;
  } catch (error) {
    console.error('Failed to generate workout plan via AI:', error);
    return generateFallbackPlan(context);
  }
}

// ── B. Mid-Workout Adjustment ────────────────────────────────────

const MID_WORKOUT_SYSTEM_PROMPT = `You are an expert strength coach providing real-time workout adjustments. Based on the athlete's completed set performance, adjust the remaining sets for optimal training stimulus.

Rules:
- If RPE is higher than expected, reduce weight 5-10% or reduce reps.
- If RPE is lower than expected, increase weight 5-10% or add reps.
- Consider fatigue accumulation across sets.
- Be specific with numbers — give exact weight and rep adjustments.
- Keep the response concise.

Respond with a JSON object:
{
  "adjustedWeight": <number or null if no change>,
  "adjustedReps": "<string like '8-10' or null if no change>",
  "note": "<brief coaching note>"
}`;

export async function getMidWorkoutAdjustment(params: {
  currentExercise: string;
  completedSets: Array<{ weight: number; reps: number; rpe: number }>;
  targetSets: number;
  targetReps: string;
  suggestedWeight: number;
}): Promise<{ adjustedWeight?: number; adjustedReps?: string; note: string }> {
  try {
    const { currentExercise, completedSets, targetSets, targetReps, suggestedWeight } = params;

    const setsRemaining = targetSets - completedSets.length;
    if (setsRemaining <= 0) {
      return { note: 'All sets completed. Nice work!' };
    }

    const setsSummary = completedSets
      .map((s, i) => `Set ${i + 1}: ${s.weight}lbs x ${s.reps} reps @ RPE ${s.rpe}`)
      .join('\n');

    const userMessage = `Exercise: ${currentExercise}
Target: ${targetSets} sets of ${targetReps} reps @ ${suggestedWeight}lbs
Completed sets:
${setsSummary}
Sets remaining: ${setsRemaining}

What adjustments should I make for the remaining sets?`;

    const responseText = await callClaude(MID_WORKOUT_SYSTEM_PROMPT, userMessage, 512);
    const result = extractJsonPayload<{ adjustedWeight?: number; adjustedReps?: string; note: string }>(responseText);
    return {
      adjustedWeight: result.adjustedWeight ?? undefined,
      adjustedReps: result.adjustedReps ?? undefined,
      note: result.note || 'Keep pushing!',
    };
  } catch (error) {
    console.error('Mid-workout adjustment error:', error);

    // Simple fallback logic
    const lastSet = params.completedSets[params.completedSets.length - 1];
    if (!lastSet) return { note: 'Start your first set and I will adjust from there.' };

    if (lastSet.rpe >= 9.5) {
      return {
        adjustedWeight: Math.round(params.suggestedWeight * 0.9),
        note: 'That looked very tough. Dropping weight 10% to maintain rep quality.',
      };
    } else if (lastSet.rpe <= 6) {
      return {
        adjustedWeight: Math.round(params.suggestedWeight * 1.05),
        note: 'That looked easy. Bump the weight up 5% for more stimulus.',
      };
    }
    return { note: 'Weight looks good. Keep the same load for remaining sets.' };
  }
}

// ── C. Post-Workout Analysis ─────────────────────────────────────

const POST_WORKOUT_SYSTEM_PROMPT = `You are an expert fitness analyst reviewing a completed workout session. Provide insightful, motivating analysis.

Respond with a JSON object:
{
  "summary": "<2-3 sentence performance summary>",
  "personalRecords": ["<any PRs or notable achievements>"],
  "recoveryTips": "<specific recovery advice based on the workout>",
  "motivation": "<brief motivational message personalized to their effort>"
}`;

export async function getPostWorkoutAnalysis(params: {
  workoutName: string;
  exercises: Array<{
    name: string;
    sets: Array<{ weight: number; reps: number }>;
    targetSets: number;
    targetReps: string;
  }>;
  duration: number;
  totalVolume: number;
  userContext: UserContext;
}): Promise<{
  summary: string;
  personalRecords: string[];
  recoveryTips: string;
  motivation: string;
}> {
  try {
    const { workoutName, exercises, duration, totalVolume, userContext } = params;

    const exerciseSummary = exercises
      .map((ex) => {
        const setsStr = ex.sets
          .map((s, i) => `  Set ${i + 1}: ${s.weight}lbs x ${s.reps}`)
          .join('\n');
        return `${ex.name} (target: ${ex.targetSets}x${ex.targetReps}):\n${setsStr}`;
      })
      .join('\n\n');

    const userMessage = `Workout completed: ${workoutName}
Duration: ${duration} minutes
Total volume: ${totalVolume} lbs

User profile:
- Experience: ${userContext.userProfile.experience}
- Goals: ${userContext.userProfile.goals.join(', ')}
- Weight: ${userContext.userProfile.weight} lbs

Exercise performance:
${exerciseSummary}

Analyze this workout session.`;

    const responseText = await callClaude(POST_WORKOUT_SYSTEM_PROMPT, userMessage, 1024);
    const result = extractJsonPayload<{
      summary: string;
      personalRecords: string[];
      recoveryTips: string;
      motivation: string;
    }>(responseText);

    return {
      summary: result.summary || 'Workout completed successfully.',
      personalRecords: result.personalRecords || [],
      recoveryTips: result.recoveryTips || 'Focus on hydration, nutrition, and sleep for optimal recovery.',
      motivation: result.motivation || 'Great effort today. Consistency is the key to progress!',
    };
  } catch (error) {
    console.error('Post-workout analysis error:', error);

    const completedExercises = params.exercises.filter((ex) => ex.sets.length > 0).length;
    return {
      summary: `You completed ${completedExercises} exercises in ${params.duration} minutes with ${params.totalVolume.toLocaleString()} lbs total volume. Solid session!`,
      personalRecords: [],
      recoveryTips: 'Prioritize protein intake within 2 hours, stay hydrated, and aim for 7-9 hours of sleep tonight.',
      motivation: 'Another workout in the books. Every session builds on the last!',
    };
  }
}

// ── D. Exercise Swap Suggestions ─────────────────────────────────

const EXERCISE_SWAP_SYSTEM_PROMPT = `You are a knowledgeable fitness coach helping a user swap an exercise in their workout. Suggest 3 alternative exercises that:
1. Target the same primary muscle group
2. Use equipment the user has available
3. Are not already in the current workout
4. Provide variety in movement pattern

Respond with a JSON array of exactly 3 objects:
[
  { "exerciseId": "<id from database>", "exerciseName": "<name>", "reason": "<brief reason this is a good swap>" }
]`;

export async function getExerciseSwapSuggestions(params: {
  exerciseToReplace: string;
  muscleGroup: string;
  availableEquipment: string[];
  currentWorkoutExercises: string[];
}): Promise<Array<{ exerciseId: string; exerciseName: string; reason: string }>> {
  try {
    const { exerciseToReplace, muscleGroup, availableEquipment, currentWorkoutExercises } = params;
    const exerciseDB = buildExerciseDatabase(availableEquipment);

    const userMessage = `I need to swap out: ${exerciseToReplace}
Target muscle group: ${muscleGroup}
Available equipment: ${availableEquipment.join(', ')}
Already in workout (do not suggest these): ${currentWorkoutExercises.join(', ')}

AVAILABLE EXERCISE DATABASE:
${exerciseDB}

Suggest 3 alternatives.`;

    const responseText = await callClaude(EXERCISE_SWAP_SYSTEM_PROMPT, userMessage, 1024);
    const suggestions = extractJsonPayload<Array<{ exerciseId: string; exerciseName: string; reason: string }>>(responseText);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid swap suggestions format');
    }

    return suggestions.slice(0, 3);
  } catch (error) {
    console.error('Exercise swap suggestion error:', error);

    // Fallback: return exercises from the database that match the muscle group
    const exercises = getExercisesByEquipment(params.availableEquipment as EquipmentType[]);
    const alternatives = exercises
      .filter(
        (ex) =>
          ex.primaryMuscle === params.muscleGroup &&
          ex.name !== params.exerciseToReplace &&
          !params.currentWorkoutExercises.includes(ex.name)
      )
      .slice(0, 3)
      .map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        reason: `Targets ${ex.primaryMuscle} using ${ex.equipment}`,
      }));

    return alternatives.length > 0
      ? alternatives
      : [
          {
            exerciseId: 'fallback',
            exerciseName: `${params.muscleGroup} alternative`,
            reason: 'No specific alternative found. Try a similar movement with available equipment.',
          },
        ];
  }
}

// ── E. AI Meal Suggestion ────────────────────────────────────────

const MEAL_SUGGESTION_SYSTEM_PROMPT = `You are an expert sports nutritionist. Suggest a single meal that helps the user meet their remaining macro targets for the day. The meal should be practical, delicious, and easy to prepare.

Respond with a JSON object:
{
  "mealName": "<name of the meal>",
  "description": "<brief description with key ingredients and simple prep instructions, 2-3 sentences>",
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>
}

The macros should be realistic for the described meal and should try to match the remaining targets as closely as possible. Do not exceed the remaining calories.`;

export async function getAIMealSuggestion(params: {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  mealType: string;
  goal: string;
}): Promise<{
  mealName: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  try {
    const { remainingCalories, remainingProtein, remainingCarbs, remainingFat, mealType, goal } = params;

    const userMessage = `Suggest a ${mealType} meal.

Remaining daily targets:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein}g
- Carbs: ${remainingCarbs}g
- Fat: ${remainingFat}g

User's fitness goal: ${goal}

The meal should use roughly ${Math.round(remainingCalories * 0.4)}-${remainingCalories} calories depending on what makes sense for this meal type.`;

    const responseText = await callClaude(MEAL_SUGGESTION_SYSTEM_PROMPT, userMessage, 512);
    const result = extractJsonPayload<{
      mealName: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>(responseText);

    return {
      mealName: result.mealName || 'Balanced Meal',
      description: result.description || 'A balanced meal with protein, carbs, and healthy fats.',
      calories: result.calories || Math.round(remainingCalories * 0.5),
      protein: result.protein || Math.round(remainingProtein * 0.5),
      carbs: result.carbs || Math.round(remainingCarbs * 0.5),
      fat: result.fat || Math.round(remainingFat * 0.5),
    };
  } catch (error) {
    console.error('AI meal suggestion error:', error);

    // Fallback meal based on remaining macros
    const cals = Math.round(params.remainingCalories * 0.4);
    const protein = Math.round(params.remainingProtein * 0.4);
    const carbs = Math.round(params.remainingCarbs * 0.4);
    const fat = Math.round(params.remainingFat * 0.4);

    const fallbackMeals: Record<string, { name: string; description: string }> = {
      breakfast: {
        name: 'Protein Oatmeal Bowl',
        description: 'Cook oats with milk, stir in a scoop of protein powder, and top with berries and a tablespoon of almond butter.',
      },
      lunch: {
        name: 'Grilled Chicken Rice Bowl',
        description: 'Grilled chicken breast over brown rice with steamed broccoli, drizzled with olive oil and soy sauce.',
      },
      dinner: {
        name: 'Salmon with Sweet Potato',
        description: 'Baked salmon fillet with roasted sweet potato wedges and a side salad with olive oil dressing.',
      },
      snack: {
        name: 'Greek Yogurt & Trail Mix',
        description: 'Plain Greek yogurt topped with a handful of mixed nuts and a drizzle of honey.',
      },
    };

    const meal = fallbackMeals[params.mealType] || fallbackMeals.lunch;
    return {
      mealName: meal.name,
      description: meal.description,
      calories: cals,
      protein,
      carbs,
      fat,
    };
  }
}

// ── F. Post-Workout Observations ──────────────────────────────────

const OBSERVATION_SYSTEM_PROMPT = `You are an elite fitness coach analyzing a completed workout session. Generate categorized observations about the athlete's performance.

Categories:
- calibration: Notes about working weights, 1RM estimates, or load adjustments needed
- form: Observations about technique or movement quality (inferred from weight/rep patterns)
- recovery: Recovery-related observations based on performance trends
- progress: Notable progress, PRs, or improvements
- recommendation: Specific actionable recommendations for future sessions

Respond with a JSON array of objects:
[
  { "category": "<category>", "observation": "<concise observation, 1-2 sentences>" }
]

Generate 3-6 observations. Be specific and actionable, not generic.`;

export async function generatePostWorkoutObservations(params: {
  exercises: Array<{
    name: string;
    muscleGroup: string;
    sets: Array<{ weight: number; reps: number; isWarmup: boolean; rir?: number | null }>;
    estimated1RM?: number | null;
    previousEstimated1RM?: number | null;
  }>;
  sessionStats: { totalWorkingSets: number; volumeByMuscle: Record<string, number>; musclesTrained: string[] };
  exerciseProfiles?: any[];
  previousObservations?: any[];
}): Promise<Array<{ category: string; observation: string }>> {
  try {
    const exerciseSummary = params.exercises.map((ex) => {
      const workingSets = ex.sets.filter((s) => !s.isWarmup);
      const setsStr = workingSets.map((s, i) => `  Set ${i + 1}: ${s.weight}lbs x ${s.reps}${s.rir != null ? ` @RIR ${s.rir}` : ''}`).join('\n');
      const e1rm = ex.estimated1RM ? ` | Est 1RM: ${ex.estimated1RM}lb` : '';
      const prev1rm = ex.previousEstimated1RM ? ` (prev: ${ex.previousEstimated1RM}lb)` : '';
      return `${ex.name} (${ex.muscleGroup})${e1rm}${prev1rm}:\n${setsStr}`;
    }).join('\n\n');

    const userMessage = `Completed workout analysis:

Working sets: ${params.sessionStats.totalWorkingSets}
Muscles trained: ${params.sessionStats.musclesTrained.join(', ')}
Volume by muscle: ${JSON.stringify(params.sessionStats.volumeByMuscle)}

Exercise performance:
${exerciseSummary}

${params.previousObservations?.length ? `Recent observations:\n${params.previousObservations.slice(0, 5).map((o) => `- [${o.category}] ${o.observation}`).join('\n')}` : ''}

Generate categorized observations.`;

    const responseText = await callClaude(OBSERVATION_SYSTEM_PROMPT, userMessage, 1024);
    const observations = extractJsonPayload<Array<{ category: string; observation: string }>>(responseText);
    if (!Array.isArray(observations)) throw new Error('Invalid observations format');
    return observations;
  } catch (error) {
    console.error('Post-workout observations error:', error);
    return [];
  }
}

// ── G. Next Session Plan ──────────────────────────────────────────

const NEXT_SESSION_SYSTEM_PROMPT = `You are an expert strength coach planning the athlete's next training session based on their recent performance and history.

Respond with a JSON object:
{
  "splitType": "<recommended split/focus for next session, e.g. 'Upper Body', 'Pull', 'Legs'>",
  "keyLifts": [
    { "exercise": "<exercise name>", "target": "<e.g. '4x6-8 @ 185lbs'>" }
  ],
  "adjustments": [
    "<specific adjustment, e.g. 'Increase bench press by 5lbs based on last session performance'>"
  ],
  "coachNotes": "<1-3 sentences of coaching advice for the next session>"
}

Be specific with weights and rep ranges. Base recommendations on the data provided.`;

export async function generateNextSessionPlan(params: {
  exerciseProfiles: any[];
  recentObservations: any[];
  workoutHistory: any[];
  userGoals: string[];
}): Promise<{ splitType: string; keyLifts: any[]; adjustments: string[]; coachNotes: string }> {
  try {
    const profilesSummary = params.exerciseProfiles
      .filter((p) => p.total_times_performed > 0)
      .slice(0, 15)
      .map((p) => `${p.exercise_name}: working weight ${p.current_working_weight || p.last_weight_used || '?'}lb, 1RM est ${p.estimated_1rm || '?'}lb, performed ${p.total_times_performed}x`)
      .join('\n');

    const recentHistory = params.workoutHistory.slice(0, 3).map((w: any) => {
      const exercises = (w.exercises || []).map((e: any) => e.name).join(', ');
      return `${w.name} (${new Date(w.started_at).toLocaleDateString()}): ${exercises}`;
    }).join('\n');

    const userMessage = `Plan next session:

Goals: ${params.userGoals.join(', ')}

Exercise profiles:
${profilesSummary || 'No profiles yet'}

Recent workouts:
${recentHistory || 'No recent history'}

Recent observations:
${params.recentObservations.slice(0, 5).map((o) => `- [${o.category}] ${o.observation}`).join('\n') || 'None'}

What should the next session focus on?`;

    const responseText = await callClaude(NEXT_SESSION_SYSTEM_PROMPT, userMessage, 1024);
    const plan = extractJsonPayload<{ splitType: string; keyLifts: any[]; adjustments: string[]; coachNotes: string }>(responseText);
    return {
      splitType: plan.splitType || '',
      keyLifts: plan.keyLifts || [],
      adjustments: plan.adjustments || [],
      coachNotes: plan.coachNotes || '',
    };
  } catch (error) {
    console.error('Next session plan error:', error);
    return { splitType: '', keyLifts: [], adjustments: [], coachNotes: 'Continue with your current program.' };
  }
}

// ── H. Import Calibration ─────────────────────────────────────────

const IMPORT_CALIBRATION_SYSTEM_PROMPT = `You are an expert strength coach analyzing imported workout data to establish baseline exercise profiles. For each exercise, estimate the current working weight range and 1RM based on the data.

Respond with a JSON array:
[
  {
    "exercise_id": "<exercise_id or name>",
    "exercise_name": "<name>",
    "current_working_weight": <number>,
    "working_weight_range": "<e.g. '135-155'>",
    "estimated_1rm": <number>
  }
]

Use the most recent data to establish current baselines. Apply the Epley formula for 1RM estimates.`;

export async function generateImportCalibration(params: {
  importedData: Array<{
    exerciseName: string;
    exerciseId?: string;
    recentSets: Array<{ weight: number; reps: number; date: string }>;
  }>;
}): Promise<Array<{
  exercise_id: string;
  exercise_name: string;
  current_working_weight: number;
  working_weight_range: string;
  estimated_1rm: number;
}>> {
  try {
    const dataSummary = params.importedData.map((d) => {
      const recent = d.recentSets.slice(0, 10);
      const setsStr = recent.map((s) => `${s.weight}lb x ${s.reps} (${s.date})`).join(', ');
      return `${d.exerciseName}: ${setsStr}`;
    }).join('\n');

    const userMessage = `Analyze imported workout data and establish baselines:

${dataSummary}

Generate exercise profiles with working weights and 1RM estimates.`;

    const responseText = await callClaude(IMPORT_CALIBRATION_SYSTEM_PROMPT, userMessage, 2048);
    const profiles = extractJsonPayload<Array<{
      exercise_id: string;
      exercise_name: string;
      current_working_weight: number;
      working_weight_range: string;
      estimated_1rm: number;
    }>>(responseText);
    if (!Array.isArray(profiles)) throw new Error('Invalid calibration format');
    return profiles;
  } catch (error) {
    console.error('Import calibration error:', error);
    return [];
  }
}

// ── I. Complete Workout with Intelligence ──────────────────────────

export async function completeWorkoutWithIntelligence(params: {
  workoutId: string;
  exercises: Array<{
    exerciseId: string;
    name: string;
    muscleGroup: string;
    sets: Array<{ weight: number; reps: number; isWarmup: boolean; rir?: number | null }>;
    estimated1RM?: number | null;
    previousEstimated1RM?: number | null;
  }>;
  sessionStats: { totalWorkingSets: number; totalVolume: number; volumeByMuscle: Record<string, number>; musclesTrained: string[] };
  durationMinutes: number;
  splitType: string;
  sessionNotes: string;
  cardioData: any;
  saunaData: any;
  userGoals: string[];
}): Promise<{
  observations: Array<{ category: string; observation: string }>;
  nextPlan: { splitType: string; keyLifts: any[]; adjustments: string[]; coachNotes: string } | null;
}> {
  // Import API functions lazily to avoid circular deps
  const api = await import('@/lib/api');

  // 1. Complete the workout in DB
  await api.completeWorkout(params.workoutId, params.durationMinutes, {
    splitType: params.splitType,
    cardioData: params.cardioData,
    saunaData: params.saunaData,
    sessionNotes: params.sessionNotes,
    volumeByMuscle: params.sessionStats.volumeByMuscle,
    musclesTrained: params.sessionStats.musclesTrained,
    totalWorkingSets: params.sessionStats.totalWorkingSets,
  });

  // 2. Update exercise profiles with new 1RMs (best effort)
  try {
    const { calculateEstimated1RM, getBestSet } = await import('@/lib/calculations');
    for (const ex of params.exercises) {
      const workingSets = ex.sets.filter((s) => !s.isWarmup);
      if (workingSets.length === 0) continue;

      let bestE1RM = 0;
      let bestWeight = 0;
      let bestReps = 0;
      for (const set of workingSets) {
        const e1rm = calculateEstimated1RM(set.weight, set.reps);
        if (e1rm > bestE1RM) {
          bestE1RM = e1rm;
          bestWeight = set.weight;
          bestReps = set.reps;
        }
      }

      if (bestE1RM > 0) {
        await api.upsertExerciseProfile({
          exercise_id: ex.exerciseId,
          exercise_name: ex.name,
          estimated_1rm: bestE1RM,
          last_weight_used: bestWeight,
          last_reps: bestReps,
          current_working_weight: bestWeight,
        }).catch(() => {});

        await api.record1RMHistory({
          exercise_id: ex.exerciseId,
          exercise_name: ex.name,
          estimated_1rm: bestE1RM,
        }).catch(() => {});
      }
    }
  } catch {}

  // 3. Generate observations (best effort)
  let observations: Array<{ category: string; observation: string }> = [];
  try {
    observations = await generatePostWorkoutObservations({
      exercises: params.exercises,
      sessionStats: params.sessionStats,
    });
    if (observations.length > 0) {
      await api.saveAIObservations(
        observations.map((o) => ({
          workout_id: params.workoutId,
          observation: o.observation,
          category: o.category,
        }))
      ).catch(() => {});
    }
  } catch {}

  // 4. Generate next session plan (best effort)
  let nextPlan: { splitType: string; keyLifts: any[]; adjustments: string[]; coachNotes: string } | null = null;
  try {
    const [profiles, recentObs, history] = await Promise.all([
      api.fetchExerciseProfiles().catch(() => []),
      api.fetchAIObservations(10).catch(() => []),
      api.fetchWorkoutHistory(5).catch(() => []),
    ]);

    nextPlan = await generateNextSessionPlan({
      exerciseProfiles: profiles,
      recentObservations: recentObs,
      workoutHistory: history,
      userGoals: params.userGoals,
    });

    if (nextPlan && nextPlan.splitType) {
      await api.saveNextSessionPlan({
        split_type: nextPlan.splitType,
        key_lifts: nextPlan.keyLifts,
        adjustments: nextPlan.adjustments,
        coach_notes: nextPlan.coachNotes,
      }).catch(() => {});
    }
  } catch {}

  return { observations, nextPlan };
}

// ── F. Fallback Plan Generator (no API) ──────────────────────────

/**
 * Generate a reasonable workout plan without calling the Claude API.
 * Uses the exercise database and simple template logic.
 */
export function generateFallbackPlan(context: UserContext): WorkoutPlan {
  const { userProfile, preferences } = context;
  const frequency = Math.min(Math.max(userProfile.workoutFrequency, 1), 7);
  const exercises = getExercisesByEquipment(userProfile.equipment as EquipmentType[]);
  const timePerSession = preferences?.availableTimePerSession || 60;
  const disliked = new Set(preferences?.dislikedExercises || []);

  // Filter out disliked exercises
  const available = exercises.filter((ex) => !disliked.has(ex.name));

  // Group exercises by primary muscle
  const byMuscle: Record<string, Exercise[]> = {};
  for (const ex of available) {
    if (!byMuscle[ex.primaryMuscle]) byMuscle[ex.primaryMuscle] = [];
    byMuscle[ex.primaryMuscle].push(ex);
  }

  // Determine split based on frequency
  const splits = buildSplit(frequency, userProfile.goals);
  const workoutDays: WorkoutDay[] = [];

  for (const split of splits) {
    const dayExercises: PlannedExercise[] = [];
    const maxExercises = Math.min(Math.floor(timePerSession / 10), 7);

    for (const muscle of split.muscles) {
      const muscleExercises = byMuscle[muscle] || [];
      if (muscleExercises.length === 0) continue;

      // Pick 1-2 exercises per muscle group for this day
      const count = split.muscles.length <= 2 ? 2 : 1;
      const picked = muscleExercises.slice(0, count);

      for (const ex of picked) {
        if (dayExercises.length >= maxExercises) break;

        const isCompound = ex.movementType === 'compound';
        const sets = isCompound ? 4 : 3;
        const reps = isCompound ? '6-8' : '10-12';
        const rest = isCompound ? 150 : 90;
        const rpe = isCompound ? 8 : 7;

        dayExercises.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets,
          reps,
          restSeconds: rest,
          suggestedWeight: null,
          rpe,
          tempo: isCompound ? '2-1-1-0' : null,
          notes: null,
          supersetWith: null,
        });
      }
    }

    // Sort: compounds first
    dayExercises.sort((a, b) => {
      const aEx = available.find((e) => e.id === a.exerciseId);
      const bEx = available.find((e) => e.id === b.exerciseId);
      const aCompound = aEx?.movementType === 'compound' ? 0 : 1;
      const bCompound = bEx?.movementType === 'compound' ? 0 : 1;
      return aCompound - bCompound;
    });

    workoutDays.push({
      type: 'workout',
      name: split.name,
      focusMuscles: split.muscles,
      estimatedDuration: Math.min(dayExercises.length * 10, timePerSession),
      warmup: `5 minutes of light cardio followed by dynamic stretches targeting ${split.muscles.slice(0, 2).join(' and ')}.`,
      exercises: dayExercises,
      finisher: split.muscles.includes('core')
        ? '3 rounds: 30s plank, 15 bicycle crunches, 10 leg raises'
        : null,
    });
  }

  // Build weekly schedule
  const schedule: Record<string, WorkoutDay | RestDay> = {};
  const workoutDayIndices = distributeWorkoutDays(frequency);

  let workoutIdx = 0;
  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[i];
    if (workoutDayIndices.includes(i) && workoutIdx < workoutDays.length) {
      schedule[dayName] = workoutDays[workoutIdx];
      workoutIdx++;
    } else {
      schedule[dayName] = {
        type: 'rest',
        recommendation: 'Light walking, stretching, or foam rolling for 20-30 minutes. Focus on hydration and sleep quality.',
      };
    }
  }

  return {
    weekNumber: 1,
    periodizationPhase: 'accumulation',
    weeklySchedule: schedule,
    coachNotes: `This is a template plan based on your ${frequency}-day schedule with ${userProfile.equipment.join(', ')} equipment. As you log workouts, the AI will personalize your programming with progressive overload and periodization.`,
  };
}

// ── Fallback helpers ─────────────────────────────────────────────

interface SplitDay {
  name: string;
  muscles: MuscleGroup[];
}

function buildSplit(frequency: number, goals: string[]): SplitDay[] {
  const isStrength = goals.some((g) => g.toLowerCase().includes('strength'));
  const isFatLoss = goals.some((g) => g.toLowerCase().includes('fat') || g.toLowerCase().includes('lose'));

  switch (frequency) {
    case 1:
      return [{ name: 'Full Body', muscles: ['chest', 'back', 'quadriceps', 'shoulders', 'core'] }];

    case 2:
      return [
        { name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
        { name: 'Lower Body', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'] },
      ];

    case 3:
      if (isStrength) {
        return [
          { name: 'Squat Day', muscles: ['quadriceps', 'glutes', 'core'] },
          { name: 'Bench Day', muscles: ['chest', 'shoulders', 'triceps'] },
          { name: 'Deadlift Day', muscles: ['back', 'hamstrings', 'biceps'] },
        ];
      }
      if (isFatLoss) {
        return [
          { name: 'Full Body A', muscles: ['chest', 'back', 'quadriceps', 'core'] },
          { name: 'Full Body B', muscles: ['shoulders', 'hamstrings', 'glutes', 'biceps'] },
          { name: 'Full Body C', muscles: ['back', 'chest', 'quadriceps', 'triceps'] },
        ];
      }
      return [
        { name: 'Push', muscles: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull', muscles: ['back', 'biceps', 'forearms'] },
        { name: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
      ];

    case 4:
      return [
        { name: 'Upper Body A', muscles: ['chest', 'back', 'shoulders'] },
        { name: 'Lower Body A', muscles: ['quadriceps', 'hamstrings', 'glutes'] },
        { name: 'Upper Body B', muscles: ['shoulders', 'biceps', 'triceps'] },
        { name: 'Lower Body B', muscles: ['quadriceps', 'glutes', 'calves', 'core'] },
      ];

    case 5:
      return [
        { name: 'Chest & Triceps', muscles: ['chest', 'triceps'] },
        { name: 'Back & Biceps', muscles: ['back', 'biceps'] },
        { name: 'Legs', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
        { name: 'Shoulders & Arms', muscles: ['shoulders', 'biceps', 'triceps'] },
        { name: 'Full Body / Weak Points', muscles: ['chest', 'back', 'core', 'glutes'] },
      ];

    case 6:
      return [
        { name: 'Push A', muscles: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull A', muscles: ['back', 'biceps', 'forearms'] },
        { name: 'Legs A', muscles: ['quadriceps', 'hamstrings', 'glutes'] },
        { name: 'Push B', muscles: ['chest', 'shoulders', 'triceps'] },
        { name: 'Pull B', muscles: ['back', 'biceps'] },
        { name: 'Legs B', muscles: ['quadriceps', 'glutes', 'calves', 'core'] },
      ];

    case 7:
      return [
        { name: 'Chest', muscles: ['chest', 'triceps'] },
        { name: 'Back', muscles: ['back', 'biceps'] },
        { name: 'Shoulders', muscles: ['shoulders', 'forearms'] },
        { name: 'Legs — Quad Focus', muscles: ['quadriceps', 'calves'] },
        { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
        { name: 'Legs — Posterior', muscles: ['hamstrings', 'glutes', 'core'] },
        { name: 'Full Body / Active Recovery', muscles: ['full_body'] },
      ];

    default:
      return [{ name: 'Full Body', muscles: ['chest', 'back', 'quadriceps', 'shoulders', 'core'] }];
  }
}

/**
 * Distribute workout days across the week for balanced recovery.
 * Returns 0-indexed day positions (0 = Monday, 6 = Sunday).
 */
function distributeWorkoutDays(frequency: number): number[] {
  const patterns: Record<number, number[]> = {
    1: [0],                          // Monday
    2: [0, 3],                       // Mon, Thu
    3: [0, 2, 4],                    // Mon, Wed, Fri
    4: [0, 1, 3, 4],                 // Mon, Tue, Thu, Fri
    5: [0, 1, 2, 4, 5],             // Mon, Tue, Wed, Fri, Sat
    6: [0, 1, 2, 3, 4, 5],          // Mon-Sat
    7: [0, 1, 2, 3, 4, 5, 6],       // Every day
  };

  return patterns[frequency] || patterns[3];
}
