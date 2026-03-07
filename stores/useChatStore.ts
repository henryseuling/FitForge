import { create } from 'zustand';
import { sendMessage, sendToolResults, type AppStateSnapshot, type Message } from '@/lib/claude';
import { executeAIToolCall } from '@/lib/aiActions';
import { saveChatMessage, fetchChatHistory } from '@/lib/api';
import { buildCoachContext } from '@/lib/coachMemory';
import { useNutritionStore } from './useNutritionStore';
import { useProgressStore } from './useProgressStore';
import { useUserStore } from './useUserStore';
import { useWorkoutStore } from './useWorkoutStore';

interface ChatMessage extends Message {
  id: string;
  timestamp: string;
}

interface ChatError {
  type: string;
  message: string;
  retryable: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  hasLoadedHistory: boolean;
  lastError: ChatError | null;
  loadHistory: () => Promise<void>;
  sendUserMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  reset: () => void;
}

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

const WELCOME_MESSAGE: ChatMessage = {
  id: '1',
  role: 'assistant',
  content:
    "Hey! I'm your FitForge Coach. I can help with workouts, nutrition, form checks, and recovery. What's on your mind?",
  timestamp: 'now',
};

function createMessageId(offset = 0): string {
  return `${Date.now() + offset}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
    if (get().isLoading) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: createTimestamp(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      lastError: null,
    }));

    saveChatMessage('user', text).catch((err) => console.warn('Failed to persist user message:', err));

    try {
      const history: Message[] = get().messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const snapshot = buildSnapshot();
      const coachContext = await buildCoachContext();
      let { text: replyText, toolCalls } = await sendMessage(history, snapshot, coachContext);

      if (toolCalls.length > 0) {
        const toolResults: Array<{ id: string; result: string }> = [];

        for (const toolCall of toolCalls) {
          try {
            const result = await executeAIToolCall(toolCall);
            toolResults.push({ id: toolCall.id, result });
          } catch (err: any) {
            toolResults.push({
              id: toolCall.id,
              result: JSON.stringify({ error: err?.message || 'Tool call failed' }),
            });
          }
        }

        for (let i = 0; i < toolResults.length; i++) {
          try {
            const parsed = JSON.parse(toolResults[i].result);
            if (parsed?.error) {
              console.warn(`Tool '${toolCalls[i]?.name}' error:`, parsed.error);
            }
          } catch {
            // Ignore non-JSON tool output.
          }
        }

        const refreshedSnapshot = buildSnapshot();
        const refreshedCoachContext = await buildCoachContext();
        const followUp = await sendToolResults(
          history,
          refreshedSnapshot,
          refreshedCoachContext,
          toolCalls,
          toolResults
        );

        replyText = followUp.text || replyText || 'Done! I updated your data.';
      }

      const finalText = replyText || '';
      const assistantMessage: ChatMessage = {
        id: createMessageId(1),
        role: 'assistant',
        content: finalText,
        timestamp: createTimestamp(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        lastError: null,
      }));

      saveChatMessage('assistant', finalText).catch((err) =>
        console.warn('Failed to persist assistant message:', err)
      );
    } catch (err: any) {
      console.error('Chat error:', err);

      const errorType = err?.type || 'unknown';
      const errorMsg = err?.message || 'Something went wrong';
      const retryable = err?.retryable !== false;

      const errorMessage: ChatMessage = {
        id: createMessageId(1),
        role: 'assistant',
        content: err?.message?.includes('Network request failed')
          ? '📡 Network error — check your connection and try again.'
          : `⚠️ ${errorMsg}`,
        timestamp: createTimestamp(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        lastError: { type: errorType, message: errorMsg, retryable },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  retryLastMessage: async () => {
    const messages = get().messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') continue;

      const userText = messages[i].content;
      set({
        messages: messages.slice(0, i),
        lastError: null,
      });
      await get().sendUserMessage(userText);
      return;
    }
  },

  reset: () =>
    set({
      messages: [WELCOME_MESSAGE],
      isLoading: false,
      hasLoadedHistory: false,
      lastError: null,
    }),
}));
