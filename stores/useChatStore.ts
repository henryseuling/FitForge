import { create } from 'zustand';
import {
  sendMessage,
  sendMessageStreaming,
  sendToolResults,
  trimHistory,
  type AppStateSnapshot,
  type Message,
} from '@/lib/claude';
import { executeAIToolCall, executeAIUndoAction, type AIUndoAction } from '@/lib/aiActions';
import { saveChatMessage, fetchChatHistory } from '@/lib/api';
import { buildCoachContext, type CoachContext } from '@/lib/coachMemory';
import { createDeterministicWorkoutToolCall } from '@/lib/workoutCommandRouter';
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

interface PendingUndo {
  summary: string;
  action: AIUndoAction;
  reviewRoute?: string;
}

export type ChatStatus = 'idle' | 'sending' | 'streaming' | 'calling_tools' | 'error';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  chatStatus: ChatStatus;
  hasLoadedHistory: boolean;
  lastError: ChatError | null;
  pendingUndo: PendingUndo | null;
  preferFastModel: boolean;
  loadHistory: () => Promise<void>;
  sendUserMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  undoLastAction: () => Promise<void>;
  clearPendingUndo: () => void;
  addAssistantMessage: (text: string) => void;
  setPreferFastModel: (value: boolean) => void;
  reset: () => void;
}

// ── Snapshot caching ──────────────────────────────────────────────

let _snapshotVersion = 0;
let _cachedSnapshot: AppStateSnapshot | null = null;
let _lastSnapshotVersion = -1;

// Increment whenever any store changes — called from subscribers below
function incrementSnapshotVersion() {
  _snapshotVersion++;
}

// Subscribe to all stores for version tracking
useUserStore.subscribe(incrementSnapshotVersion);
useWorkoutStore.subscribe(incrementSnapshotVersion);
useNutritionStore.subscribe(incrementSnapshotVersion);
useProgressStore.subscribe(incrementSnapshotVersion);

function buildSnapshot(): AppStateSnapshot {
  if (_lastSnapshotVersion === _snapshotVersion && _cachedSnapshot) {
    return _cachedSnapshot;
  }

  const user = useUserStore.getState();
  const workout = useWorkoutStore.getState();
  const nutrition = useNutritionStore.getState();
  const progress = useProgressStore.getState();

  _cachedSnapshot = {
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
    health:
      workout.hrv || workout.restingHR || workout.sleepScore || workout.recoveryScore
        ? {
            hrv: workout.hrv || null,
            restingHR: workout.restingHR || null,
            sleepScore: workout.sleepScore || null,
            recoveryScore: workout.recoveryScore || null,
          }
        : undefined,
  };
  _lastSnapshotVersion = _snapshotVersion;
  return _cachedSnapshot;
}

// ── Coach context caching (60s TTL) ──────────────────────────────

let _cachedCoachContext: CoachContext | null = null;
let _coachContextTimestamp = 0;
const COACH_CONTEXT_TTL = 60_000; // 60 seconds

async function getCachedCoachContext(): Promise<CoachContext> {
  const now = Date.now();
  if (_cachedCoachContext && now - _coachContextTimestamp < COACH_CONTEXT_TTL) {
    return _cachedCoachContext;
  }
  _cachedCoachContext = await buildCoachContext();
  _coachContextTimestamp = now;
  return _cachedCoachContext;
}

function invalidateCoachContextCache() {
  _cachedCoachContext = null;
  _coachContextTimestamp = 0;
}

// ── Constants & helpers ──────────────────────────────────────────

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

function buildToolSummary(toolResults: Array<{ id: string; result: string }>): string {
  const summaries = toolResults
    .map((toolResult) => {
      try {
        const parsed = JSON.parse(toolResult.result);
        return typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
      } catch {
        return '';
      }
    })
    .filter(Boolean);

  if (summaries.length === 0) return '';
  return `Updated:\n• ${summaries.join('\n• ')}`;
}

function extractPendingUndo(toolResults: Array<{ id: string; result: string }>): PendingUndo | null {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(toolResults[i].result);
      if (parsed?.undo && typeof parsed?.summary === 'string') {
        return {
          summary: parsed.summary,
          action: parsed.undo as AIUndoAction,
          reviewRoute: typeof parsed.reviewRoute === 'string' ? parsed.reviewRoute : undefined,
        };
      }
    } catch {
      // Ignore malformed tool outputs.
    }
  }
  return null;
}

// ── Active request tracking (abort on new request) ───────────────

let _activeAbortController: AbortController | null = null;

function abortPreviousRequest() {
  if (_activeAbortController) {
    _activeAbortController.abort();
    _activeAbortController = null;
  }
}

// ── Store ────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME_MESSAGE],
  isLoading: false,
  chatStatus: 'idle' as ChatStatus,
  hasLoadedHistory: false,
  lastError: null,
  pendingUndo: null,
  preferFastModel: true,

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

    // Abort any in-flight request
    abortPreviousRequest();
    const abortController = new AbortController();
    _activeAbortController = abortController;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: text,
      timestamp: createTimestamp(),
    };

    // Create a placeholder assistant message for streaming
    const streamingMessageId = createMessageId(1);

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      chatStatus: 'sending' as ChatStatus,
      lastError: null,
    }));

    saveChatMessage('user', text).catch((err) => console.warn('Failed to persist user message:', err));

    try {
      const workoutState = useWorkoutStore.getState();
      if (!workoutState.workoutName && workoutState.exercises.length === 0) {
        await workoutState.hydrateUpcomingWorkout().catch(() => false);
      }

      const history: Message[] = get().messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const [snapshot, coachContext] = await Promise.all([
        Promise.resolve(buildSnapshot()),
        getCachedCoachContext(),
      ]);

      const deterministicWorkoutTool = createDeterministicWorkoutToolCall(text);
      let replyText = '';
      let toolCalls = deterministicWorkoutTool
        ? [deterministicWorkoutTool]
        : [];

      if (!deterministicWorkoutTool) {
        // Add streaming placeholder
        const streamingMessage: ChatMessage = {
          id: streamingMessageId,
          role: 'assistant',
          content: '',
          timestamp: createTimestamp(),
        };

        set((state) => ({
          messages: [...state.messages, streamingMessage],
          chatStatus: 'streaming' as ChatStatus,
        }));

        try {
          const response = await sendMessageStreaming(
            history,
            snapshot,
            coachContext,
            {
              onToken: (token) => {
                // Update the streaming message content in place
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === streamingMessageId
                      ? { ...m, content: m.content + token }
                      : m
                  ),
                }));
              },
              preferFastModel: get().preferFastModel,
              signal: abortController.signal,
            }
          );
          replyText = response.text;
          toolCalls = response.toolCalls;
        } catch (err) {
          // If streaming failed entirely, remove placeholder and fall back
          if (err instanceof Error && err.name === 'AbortError') {
            set((state) => ({
              messages: state.messages.filter((m) => m.id !== streamingMessageId),
            }));
            return;
          }

          set((state) => ({
            messages: state.messages.filter((m) => m.id !== streamingMessageId),
          }));

          const response = await sendMessage(history, snapshot, coachContext, {
            preferFastModel: get().preferFastModel,
          });
          replyText = response.text;
          toolCalls = response.toolCalls;
        }
      }

      if (toolCalls.length > 0) {
        set({ chatStatus: 'calling_tools' as ChatStatus });

        // Invalidate coach context cache since tools may change data
        invalidateCoachContextCache();

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

        // Invalidate snapshot cache since tool calls change state
        _lastSnapshotVersion = -1;

        const refreshedSnapshot = buildSnapshot();
        const refreshedCoachContext = await buildCoachContext();
        _cachedCoachContext = refreshedCoachContext;
        _coachContextTimestamp = Date.now();

        const followUp = await sendToolResults(
          history,
          refreshedSnapshot,
          refreshedCoachContext,
          toolCalls,
          toolResults
        );

        const toolSummary = buildToolSummary(toolResults);
        const followUpText = followUp.text || replyText || '';

        if (toolSummary && followUpText) {
          replyText = `${toolSummary}\n\n${followUpText}`.trim();
        } else {
          replyText = toolSummary || followUpText || 'Done! I updated your data.';
        }

        set({ pendingUndo: extractPendingUndo(toolResults) });
      } else {
        set({ pendingUndo: null });
      }

      const finalText = replyText || '';

      // If we used streaming, update the placeholder message; otherwise add new
      if (!deterministicWorkoutTool) {
        // Remove the streaming placeholder and add the final message
        // (the placeholder may have partial text from streaming that we want to replace
        //  if tool calls changed the reply, or keep if no tools were called)
        if (toolCalls.length > 0) {
          // Tools were called — replace streaming placeholder with final composed text
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === streamingMessageId
                ? { ...m, content: finalText, timestamp: createTimestamp() }
                : m
            ),
            lastError: null,
          }));
        } else {
          // No tools — streaming message already has the final content, just ensure timestamp
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === streamingMessageId
                ? { ...m, timestamp: createTimestamp() }
                : m
            ),
            lastError: null,
          }));
        }
      } else {
        // Deterministic tool call path — no streaming placeholder exists
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
      }

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
          ? 'Network error — check your connection and try again.'
          : errorMsg,
        timestamp: createTimestamp(),
      };

      set((state) => ({
        messages: [
          // Remove streaming placeholder if it exists
          ...state.messages.filter((m) => m.id !== streamingMessageId),
          errorMessage,
        ],
        lastError: { type: errorType, message: errorMsg, retryable },
        chatStatus: 'error' as ChatStatus,
      }));
    } finally {
      if (_activeAbortController === abortController) {
        _activeAbortController = null;
      }
      set({ isLoading: false, chatStatus: 'idle' as ChatStatus });
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

  undoLastAction: async () => {
    const pendingUndo = get().pendingUndo;
    if (!pendingUndo) return;

    set({ isLoading: true, pendingUndo: null, lastError: null });

    try {
      await executeAIUndoAction(pendingUndo.action);
      invalidateCoachContextCache();

      const assistantMessage: ChatMessage = {
        id: createMessageId(1),
        role: 'assistant',
        content: `Undid the last change.\n\nReverted: ${pendingUndo.summary}`,
        timestamp: createTimestamp(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
      }));

      saveChatMessage('assistant', assistantMessage.content).catch((err) =>
        console.warn('Failed to persist assistant message:', err)
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Could not undo that action.';
      const assistantMessage: ChatMessage = {
        id: createMessageId(1),
        role: 'assistant',
        content: errorMessage,
        timestamp: createTimestamp(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        lastError: { type: 'undo_failed', message: errorMessage, retryable: false },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  clearPendingUndo: () => set({ pendingUndo: null }),

  addAssistantMessage: (text: string) => {
    const assistantMessage: ChatMessage = {
      id: createMessageId(1),
      role: 'assistant',
      content: text,
      timestamp: createTimestamp(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
    }));

    saveChatMessage('assistant', text).catch((err) =>
      console.warn('Failed to persist assistant message:', err)
    );
  },

  setPreferFastModel: (value: boolean) => set({ preferFastModel: value }),

  reset: () => {
    invalidateCoachContextCache();
    set({
      messages: [WELCOME_MESSAGE],
      isLoading: false,
      chatStatus: 'idle' as ChatStatus,
      hasLoadedHistory: false,
      lastError: null,
      pendingUndo: null,
    });
  },
}));
