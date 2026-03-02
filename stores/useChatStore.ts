import { create } from 'zustand';
import { sendMessage, sendToolResults, type Message, type AppStateSnapshot, type ToolCall } from '@/lib/claude';
import { saveChatMessage, fetchChatHistory } from '@/lib/api';
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

  loadHistory: () => Promise<void>;
  sendUserMessage: (text: string) => Promise<void>;
  reset: () => void;
}

// ── Build a snapshot of all stores for the system prompt ─────────

function buildSnapshot(): AppStateSnapshot {
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
    },
  };
}

// ── Dispatch a single tool call to the appropriate store ─────────

function dispatchToolCall(tc: ToolCall): string {
  const input = tc.input as Record<string, any>;

  try {
    switch (tc.name) {
      // Workout
      case 'log_set':
        useWorkoutStore.getState().logSet(input.exerciseId, {
          setNumber: input.setNumber,
          weight: input.weight,
          reps: input.reps,
          rir: input.rir ?? 2,
          isWarmup: input.isWarmup ?? false,
          perSide: input.perSide ?? false,
          bodyweight: input.bodyweight ?? false,
          note: input.note ?? '',
        });
        return JSON.stringify({ success: true, exerciseId: input.exerciseId, setNumber: input.setNumber });
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
      case 'add_meal':
        useNutritionStore.getState().addMeal({
          id: Date.now().toString(),
          type: input.type,
          time: input.time,
          foods: input.foods,
          totalCalories: input.totalCalories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
        });
        return JSON.stringify({ success: true, totalCalories: input.totalCalories });
      case 'update_nutrition_targets':
        useNutritionStore.getState().updateTargets(input);
        return JSON.stringify({ success: true, ...input });

      // Progress
      case 'update_key_lift':
        useProgressStore.getState().updateKeyLift({ name: input.name, weight: input.weight });
        return JSON.stringify({ success: true, name: input.name, weight: input.weight });
      case 'log_body_weight':
        useProgressStore.getState().logBodyWeight(input.weight);
        return JSON.stringify({ success: true, weight: input.weight });

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
      id: Date.now().toString(),
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
    }));

    // Persist user message (fire-and-forget)
    saveChatMessage('user', text).catch(() => {});

    try {
      const history: Message[] = get().messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Build live state snapshot and send with tools
      const snapshot = buildSnapshot();
      let { text: replyText, toolCalls } = await sendMessage(history, snapshot);

      // If Claude returned tool calls, dispatch them and send results back
      if (toolCalls.length > 0) {
        const toolResults = toolCalls.map((tc) => ({
          id: tc.id,
          result: dispatchToolCall(tc),
        }));

        // Send tool results back to Claude for a final text response
        const followUp = await sendToolResults(history, snapshot, toolCalls, toolResults);
        replyText = followUp.text || replyText || 'Done! I updated your data.';
      }

      const finalText = replyText || '';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
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
      }));

      // Persist assistant message (fire-and-forget)
      saveChatMessage('assistant', finalText).catch(() => {});
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  reset: () => set({ messages: [WELCOME_MESSAGE], isLoading: false, hasLoadedHistory: false }),
}));
