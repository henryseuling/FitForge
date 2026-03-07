// AI Tool definitions for Claude tool use API
// Each tool maps to a Zustand store action so the AI coach can modify app state.

export interface AiTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const AI_TOOLS: AiTool[] = [
  // ── Workout tools ──────────────────────────────────────────────
  {
    name: 'log_set',
    description:
      'Log a completed set for an exercise in the current workout. Use when the user reports reps/weight they just did.',
    input_schema: {
      type: 'object',
      properties: {
        exerciseId: { type: 'string', description: 'ID of the exercise' },
        setNumber: { type: 'number', description: 'Set number (1-based)' },
        weight: { type: 'number', description: 'Weight used in lbs' },
        reps: { type: 'number', description: 'Number of reps completed' },
        rir: { type: 'number', description: 'Reps in reserve (0-5). Default 2 if unknown.' },
      },
      required: ['exerciseId', 'setNumber', 'weight', 'reps'],
    },
  },
  {
    name: 'set_active_exercise',
    description: 'Switch the active exercise in the workout by its index.',
    input_schema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: 'Zero-based index of the exercise to activate' },
      },
      required: ['index'],
    },
  },
  {
    name: 'start_rest_timer',
    description: 'Start the rest timer between sets.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'skip_rest_timer',
    description: 'Skip / cancel the currently running rest timer.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_rest_time',
    description: 'Add extra seconds to the current rest timer.',
    input_schema: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'Seconds to add (e.g. 30)' },
      },
      required: ['seconds'],
    },
  },
  {
    name: 'update_readiness',
    description: 'Update today\'s readiness / recovery scores.',
    input_schema: {
      type: 'object',
      properties: {
        score: { type: 'number', description: 'Overall readiness score (0-100)' },
        hrv: { type: 'number', description: 'HRV value' },
        restingHR: { type: 'number', description: 'Resting heart rate' },
        sleepScore: { type: 'number', description: 'Sleep quality score (0-100)' },
        recoveryScore: { type: 'number', description: 'Recovery score (0-100)' },
      },
      required: ['score', 'hrv', 'restingHR', 'sleepScore', 'recoveryScore'],
    },
  },
  {
    name: 'start_workout',
    description: 'Mark the workout as started (begins the duration timer).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'replace_exercise',
    description: 'Replace an exercise in the current workout when the user wants a swap.',
    input_schema: {
      type: 'object',
      properties: {
        exerciseId: { type: 'string', description: 'ID of the exercise being replaced' },
        replacementName: { type: 'string', description: 'Name of the replacement exercise' },
        muscleGroup: { type: 'string', description: 'Primary muscle group for the replacement' },
        sets: { type: 'number', description: 'Target number of sets' },
        repsMin: { type: 'number', description: 'Minimum reps' },
        repsMax: { type: 'number', description: 'Maximum reps' },
        weight: { type: 'number', description: 'Suggested working weight in lbs' },
        note: { type: 'string', description: 'Why the replacement was made' },
      },
      required: ['exerciseId', 'replacementName'],
    },
  },
  {
    name: 'set_session_notes',
    description: 'Save a short coaching note or session note for the active workout.',
    input_schema: {
      type: 'object',
      properties: {
        notes: { type: 'string', description: 'Workout/session notes to save' },
      },
      required: ['notes'],
    },
  },

  // ── Nutrition tools ────────────────────────────────────────────
  {
    name: 'add_meal',
    description: 'Log a meal with macros. Use when the user reports what they ate.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Meal name, e.g. "Chicken burrito bowl"' },
        type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal type' },
        time: { type: 'string', description: 'Time the meal was eaten, e.g. "2:30 PM"' },
        foods: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              calories: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
            },
            required: ['name', 'calories'],
          },
          description: 'List of food items',
        },
        totalCalories: { type: 'number', description: 'Total calories for the meal' },
        protein: { type: 'number', description: 'Grams of protein' },
        carbs: { type: 'number', description: 'Grams of carbs' },
        fat: { type: 'number', description: 'Grams of fat' },
      },
      required: ['type', 'time', 'foods', 'totalCalories', 'protein', 'carbs', 'fat'],
    },
  },
  {
    name: 'update_nutrition_targets',
    description: 'Update daily nutrition targets (calories and/or macros).',
    input_schema: {
      type: 'object',
      properties: {
        calorieTarget: { type: 'number', description: 'Daily calorie target' },
        proteinTarget: { type: 'number', description: 'Daily protein target in grams' },
        carbsTarget: { type: 'number', description: 'Daily carbs target in grams' },
        fatTarget: { type: 'number', description: 'Daily fat target in grams' },
      },
    },
  },
  {
    name: 'log_water',
    description: 'Log or update today\'s water intake in glasses.',
    input_schema: {
      type: 'object',
      properties: {
        glasses: { type: 'number', description: 'Total glasses of water consumed today' },
      },
      required: ['glasses'],
    },
  },

  // ── Progress tools ─────────────────────────────────────────────
  {
    name: 'update_key_lift',
    description: 'Update a key lift PR (e.g. Bench Press, Squat, Deadlift, OHP).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Lift name, e.g. "Bench Press"' },
        weight: { type: 'number', description: 'New PR weight in lbs' },
      },
      required: ['name', 'weight'],
    },
  },
  {
    name: 'log_body_weight',
    description: 'Log the user\'s current body weight.',
    input_schema: {
      type: 'object',
      properties: {
        weight: { type: 'number', description: 'Body weight in lbs' },
      },
      required: ['weight'],
    },
  },

  // ── Profile tools ──────────────────────────────────────────────
  {
    name: 'update_profile',
    description: 'Update user profile fields (name, level, height, weight, training split, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        level: { type: 'string' },
        height: { type: 'string' },
        weight: { type: 'number' },
        trainingSplit: { type: 'string' },
        calorieTarget: { type: 'number' },
        macroSplit: { type: 'string' },
      },
    },
  },
  {
    name: 'toggle_progressive_overload',
    description: 'Toggle the progressive overload setting on or off.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_goal',
    description: 'Create a structured goal for the user, like a bodyweight or strength target.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Goal type, e.g. strength, weight, nutrition' },
        title: { type: 'string', description: 'Goal title' },
        targetValue: { type: 'number', description: 'Target value' },
        currentValue: { type: 'number', description: 'Current value' },
        unit: { type: 'string', description: 'Unit, e.g. lb, kcal, workouts/week' },
        deadline: { type: 'string', description: 'Optional ISO date deadline' },
      },
      required: ['title', 'targetValue', 'unit'],
    },
  },
  {
    name: 'remember_preference',
    description: 'Save a durable user preference or coaching constraint so future responses stay personalized.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category like nutrition, injury, preference, schedule' },
        content: { type: 'string', description: 'The durable preference or constraint to remember' },
        pinned: { type: 'boolean', description: 'Whether this memory should be prioritized' },
        metadata: { type: 'object', description: 'Optional structured metadata' },
      },
      required: ['content'],
    },
  },
];
