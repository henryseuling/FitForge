import { create } from 'zustand';
import { sendMessage, sendToolResults, type Message, type AppStateSnapshot, type ToolCall } from '@/lib/claude';
import { saveChatMessage, fetchChatHistory, fetchGoals } from '@/lib/api';
import { useWorkoutStore } from './useWorkoutStore';
import { useNutritionStore } from './useNutritionStore';
import { useProgressStore } from './useProgressStore';
import { useUserStore } from './useUserStore';

interface ChatMessage extends Message {
  id: string;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  hasLoadedHistory: boolean;
  lastError: { type: string; message: string; retryable: boolean } | null;

  loadHistory: () => Promise<void>;
  sendUserMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  reset: () => void;
}

// ── Build a snapshot of all stores for the system prompt ─────────

// Attempt to load health data from HealthKit
async function loadHealthData(): Promise<AppStateSnapshot['health'] | null> {
  try {
    // Use dynamic import for React Native/Expo compatibility
    const health = await import('@/lib/health').catch(() => null);
    if (!health) return null;
    const [hrv, restingHR, sleepData, readinessScore] = await Promise.all([
      health.getHRV().catch(() => null),
      health.getRestingHeartRate().catch(() => null),
      health.getSleepData().catch(() => null),
      health.getReadinessScore().catch(() => ({ score: 0 })),
    ]);
    return {
      hrv: hrv ?? null,
      restingHR: restingHR ?? null,
      sleepMinutes: sleepData?.totalMinutes ?? null,
      sleepScore: sleepData?.score ?? null,
      readinessScore: readinessScore?.score ?? 0,
    };
  } catch {
    return null;
  }
}

// Attempt to load goals from store or API
async function loadGoals(): Promise<AppStateSnapshot['progress']['goals']> {
  try {
    const goals = await fetchGoals();
    return (goals || []).map((g: any) => ({
      id: g.id,
      type: g.type || 'general',
      title: g.title,
      target_value: g.target_value,
      current_value: g.current_value,
      unit: g.unit || '',
    }));
  } catch {
    return [];
  }
}

function buildSnapshot(goals?: AppStateSnapshot['progress']['goals'], healthData?: AppStateSnapshot['health']): AppStateSnapshot {
  const user = useUserStore.getState();
  const workout = useWorkoutStore.getState();
  const nutrition = useNutritionStore.getState();
  const progress = useProgressStore.getState();

  return {
    user: {
      name: user.name,
      level: user.level,
      height: user.height,
      weight: user.weight,
      trainingSplit: user.trainingSplit,
      progressiveOverload: user.progressiveOverload,
      calorieTarget: nutrition.calorieTarget,
      macroSplit: user.macroSplit,
    },
    workout: {
      workoutName: workout.workoutName,
      dayNumber: workout.dayNumber,
      readinessScore: workout.readinessScore,
      workoutStartedAt: workout.workoutStartedAt,
      activeExerciseIndex: workout.activeExerciseIndex,
      exercises: workout.exercises,
    },
    nutrition: {
      calorieTarget: nutrition.calorieTarget,
      proteinTarget: nutrition.proteinTarget,
      carbsTarget: nutrition.carbsTarget,
      fatTarget: nutrition.fatTarget,
      meals: nutrition.meals,
      totalCalories: nutrition.totalCalories(),
      totalProtein: nutrition.totalProtein(),
      totalCarbs: nutrition.totalCarbs(),
      totalFat: nutrition.totalFat(),
    },
    progress: {
      keyLifts: progress.keyLifts,
      weight: progress.weight,
      streak: progress.streak,
      goals: goals ?? [],
    },
    health: healthData ?? undefined,
  };
}

// ── Input validation helpers ─────────────────────────────────────

function validatePositive(value: any, name: string): void {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number (got ${value})`);
  }
}

function validateRequired(value: any, name: string): void {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${name} is required`);
  }
}

// ── Dispatch a single tool call to the appropriate store ─────────

function dispatchToolCall(tc: ToolCall): string {
  const input = tc.input as Record<string, any>;

  try {
    switch (tc.name) {
      // Workout
      case 'log_set': {
        validateRequired(input.exerciseId, 'exerciseId');
        validatePositive(input.weight, 'weight');
        validatePositive(input.reps, 'reps');
        if (input.reps < 1) throw new Error('reps must be at least 1');
        useWorkoutStore.getState().logSet(input.exerciseId, {
          setNumber: input.setNumber,
          weight: Math.max(0, input.weight),
          reps: Math.max(1, Math.round(input.reps)),
          rir: input.rir ?? 2,
          isWarmup: input.isWarmup ?? false,
          perSide: input.perSide ?? false,
          bodyweight: input.bodyweight ?? false,
          note: input.note ?? '',
        });
        return JSON.stringify({ success: true, exerciseId: input.exerciseId, setNumber: input.setNumber });
      }
      case 'set_active_exercise':
        useWorkoutStore.getState().setActiveExercise(input.index);
        return JSON.stringify({ success: true, index: input.index });
      case 'start_rest_timer':
        useWorkoutStore.getState().startRestTimer();
        return JSON.stringify({ success: true });
      case 'skip_rest_timer':
        useWorkoutStore.getState().skipRestTimer();
        return JSON.stringify({ success: true });
      case 'add_rest_time':
        validatePositive(input.seconds, 'seconds');
        useWorkoutStore.getState().addRestTime(input.seconds);
        return JSON.stringify({ success: true, seconds: input.seconds });
      case 'update_readiness':
        useWorkoutStore.getState().updateReadiness({
          score: input.score,
          hrv: input.hrv,
          restingHR: input.restingHR,
          sleepScore: input.sleepScore,
          recoveryScore: input.recoveryScore,
        });
        return JSON.stringify({ success: true });
      case 'start_workout':
        useWorkoutStore.getState().startWorkout();
        return JSON.stringify({ success: true });

      // Nutrition
      case 'add_meal': {
        validateRequired(input.type, 'meal type');
        validatePositive(input.totalCalories, 'totalCalories');
        validatePositive(input.protein, 'protein');
        validatePositive(input.carbs, 'carbs');
        validatePositive(input.fat, 'fat');
        useNutritionStore.getState().addMeal({
          id: Date.now().toString(),
          type: input.type,
          time: input.time || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          foods: input.foods || [{ name: input.type, calories: input.totalCalories }],
          totalCalories: Math.round(input.totalCalories),
          protein: Math.round(input.protein),
          carbs: Math.round(input.carbs),
          fat: Math.round(input.fat),
        });
        return JSON.stringify({ success: true, totalCalories: input.totalCalories });
      }
      case 'update_nutrition_targets': {
        if (input.calorieTarget !== undefined) validatePositive(input.calorieTarget, 'calorieTarget');
        if (input.proteinTarget !== undefined) validatePositive(input.proteinTarget, 'proteinTarget');
        if (input.carbsTarget !== undefined) validatePositive(input.carbsTarget, 'carbsTarget');
        if (input.fatTarget !== undefined) validatePositive(input.fatTarget, 'fatTarget');
        useNutritionStore.getState().updateTargets(input);
        return JSON.stringify({ success: true, ...input });
      }

      // Progress
      case 'update_key_lift': {
        validateRequired(input.name, 'name');
        validatePositive(input.weight, 'weight');
        useProgressStore.getState().updateKeyLift({ name: input.name, weight: input.weight });
        return JSON.stringify({ success: true, name: input.name, weight: input.weight });
      }
      case 'log_body_weight': {
        validatePositive(input.weight, 'weight');
        if (input.weight < 50 || input.weight > 700) throw new Error('Weight seems unrealistic (expected 50-700)');
        useProgressStore.getState().logBodyWeight(input.weight);
        return JSON.stringify({ success: true, weight: input.weight });
      }

      // Profile
      case 'update_profile':
        useUserStore.getState().updateProfile(input);
        return JSON.stringify({ success: true });
      case 'toggle_progressive_overload':
        useUserStore.getState().toggleProgressiveOverload();
        return JSON.stringify({ success: true });

      default:
        return JSON.stringify({ error: `Unknown tool: ${tc.name}` });
    }
  } catch (err: any) {
    console.warn(`Tool call '${tc.name}' failed:`, err.message);
    return JSON.stringify({ error: err.message || 'Tool call failed' });
  }
}

// ── Store ────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content:
    "Hey! I'm your FitForge Coach. I can help with workouts, nutrition, form checks, and recovery. What's on your mind?",
  timestamp: 'now',
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  isLoading: false,
  hasLoadedHistory: false,
  lastError: null,

  loadHistory: async () => {
    if (get().hasLoadedHistory) return;
    try {
      const history = await fetchChatHistory(50);
      if (history.length > 0) {
        const messages: ChatMessage[] = history.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }));
        set({ messages, hasLoadedHistory: true });
      } else {
        set({ hasLoadedHistory: true });
      }
    } catch {
      set({ hasLoadedHistory: true });
    }
  },

  sendUserMessage: async (text: string) => {
    if (get().isLoading) return; // Prevent concurrent sends

    const userMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      lastError: null,
    }));

    // Persist user message (fire-and-forget)
    saveChatMessage('user', text).catch((err) => console.warn('Failed to persist user message:', err));

    try {
      const history: Message[] = get().messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Load goals + health data in parallel, then build snapshot
      const [goals, healthData] = await Promise.all([
        loadGoals(),
        loadHealthData(),
      ]);
      const snapshot = buildSnapshot(goals, healthData ?? undefined);
      let { text: replyText, toolCalls } = await sendMessage(history, snapshot);

      // If Claude returned tool calls, dispatch them and send results back
      if (toolCalls.length > 0) {
        const toolResults = toolCalls.map((tc) => ({
          id: tc.id,
          result: dispatchToolCall(tc),
        }));

        // Log tool results for debugging
        toolResults.forEach((tr, idx) => {
          const parsed = JSON.parse(tr.result);
          if (parsed.error) console.warn(`Tool '${toolCalls[idx]?.name}' error:`, parsed.error);
        });

        // Send tool results back to Claude for a final text response
        const followUp = await sendToolResults(history, snapshot, toolCalls, toolResults);
        replyText = followUp.text || replyText || 'Done! I updated your data.';
      }

      const finalText = replyText || '';

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: finalText,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
        lastError: null,
      }));

      // Persist assistant message (fire-and-forget)
      saveChatMessage('assistant', finalText).catch((err) => console.warn('Failed to persist assistant message:', err));
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorType = err?.type || 'unknown';
      const errorMsg = err?.message || 'Something went wrong';
      const retryable = err?.retryable !== false;

      const errorMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: err?.message?.includes('Network request failed')
          ? '📡 Network error — check your connection and try again.'
          : `⚠️ ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
        lastError: { type: errorType, message: errorMsg, retryable },
      }));
    }
  },

  retryLastMessage: async () => {
    const messages = get().messages;
    // Find the last user message and remove only the error message(s) that followed it
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        // Keep everything up to and including the user message, remove error messages after it
        const cleaned = messages.slice(0, i + 1);
        set({ messages: cleaned, lastError: null });
        // Re-send using the same text (sendUserMessage will add to state, so remove the user msg first)
        const userText = messages[i].content;
        set({ messages: messages.slice(0, i), lastError: null });
        await get().sendUserMessage(userText);
        return;
      }
    }
  },

  reset: () => set({ messages: [WELCOME_MESSAGE], isLoading: false, hasLoadedHistory: false, lastError: null }),
}));
