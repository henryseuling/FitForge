// Claude AI Coach client — with tool use support
// NOTE: In production, API calls should go through your backend server
// to keep the API key secure. This is a simplified client for development.

import { AI_TOOLS } from './aiTools';
import type { Exercise } from '@/stores/useWorkoutStore';
import type { Meal } from '@/stores/useNutritionStore';
import type { KeyLift } from '@/stores/useProgressStore';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// TODO: Move to a Supabase Edge Function in production — never ship API keys in a mobile app
const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

// ── Error types for actionable error handling ────────────────────

export enum ApiErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  RATE_LIMIT = 'rate_limit',
  OVERLOADED = 'overloaded',
  INVALID_REQUEST = 'invalid_request',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

export interface ApiError {
  type: ApiErrorType;
  status?: number;
  message: string;
  retryable: boolean;
}

function classifyError(status: number, body?: string): ApiError {
  switch (status) {
    case 401:
      return { type: ApiErrorType.AUTH, status, message: 'Invalid API key. Check your EXPO_PUBLIC_CLAUDE_API_KEY configuration.', retryable: false };
    case 400:
      return { type: ApiErrorType.INVALID_REQUEST, status, message: `Bad request: ${body || 'check model name and request format'}`, retryable: false };
    case 429:
      return { type: ApiErrorType.RATE_LIMIT, status, message: 'Rate limited — too many requests. Retrying...', retryable: true };
    case 502:
      return { type: ApiErrorType.SERVER, status, message: 'Bad gateway — the server is temporarily unavailable. Retrying...', retryable: true };
    case 503:
      return { type: ApiErrorType.SERVER, status, message: 'Service temporarily unavailable. Retrying...', retryable: true };
    case 504:
      return { type: ApiErrorType.SERVER, status, message: 'Gateway timeout — the request took too long. Retrying...', retryable: true };
    case 529:
      return { type: ApiErrorType.OVERLOADED, status, message: 'Claude is overloaded. Retrying...', retryable: true };
    default:
      if (status >= 500) return { type: ApiErrorType.SERVER, status, message: `Server error (${status}). Retrying...`, retryable: true };
      return { type: ApiErrorType.UNKNOWN, status, message: `Unexpected error (${status}): ${body || 'unknown'}`, retryable: false };
  }
}

// ── Retry helper with exponential backoff ────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error?.retryable === true;
      if (!isRetryable || attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Snapshot of live app state passed into the system prompt ──────

export interface AppStateSnapshot {
  user: {
    name: string;
    level: string;
    height: string;
    weight: number;
    trainingSplit: string;
    progressiveOverload: boolean;
    calorieTarget: number;
    macroSplit: string;
  };
  workout: {
    workoutName: string;
    dayNumber: number;
    readinessScore: number;
    workoutStartedAt: number | null;
    activeExerciseIndex: number;
    exercises: Exercise[];
  };
  nutrition: {
    calorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    meals: Meal[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  progress: {
    keyLifts: KeyLift[];
    weight: number;
    streak: number;
    goals?: Array<{ id: string; type: string; title: string; target_value: number; current_value: number; unit: string }>;
  };
  health?: {
    hrv: number | null;
    restingHR: number | null;
    sleepMinutes: number | null;
    sleepScore: number | null;
    readinessScore: number;
  };
}

// ── Response type ────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeResponse {
  text: string;
  toolCalls: ToolCall[];
}

// ── System prompt builder ────────────────────────────────────────

function formatExercise(ex: Exercise, idx: number, activeIdx: number): string {
  const status = ex.completedSets.length >= ex.sets
    ? '✓ done'
    : `${ex.completedSets.length}/${ex.sets} sets`;
  const active = idx === activeIdx ? ' ← ACTIVE' : '';
  return `  [${idx}] ${ex.name} (${ex.muscleGroup}) — ${ex.weight}lb × ${ex.repsMin}-${ex.repsMax} reps — ${status}${active}  (id: "${ex.id}")`;
}

export function buildSystemPrompt(state: AppStateSnapshot): string {
  const { user, workout, nutrition, progress, health } = state;

  const exerciseLines = workout.exercises
    .map((ex, i) => formatExercise(ex, i, workout.activeExerciseIndex))
    .join('\n');

  const mealLines = nutrition.meals
    .map((m) => `  ${m.type} (${m.time}): ${m.totalCalories} kcal — ${m.protein}P/${m.carbs}C/${m.fat}F — ${m.foods.map((f) => f.name).join(', ')}`)
    .join('\n');

  const liftLines = progress.keyLifts
    .map((l) => `  ${l.name}: ${l.weight} ${l.unit} (${l.delta >= 0 ? '+' : ''}${l.delta})`)
    .join('\n');

  const goalLines = (progress.goals && progress.goals.length > 0)
    ? progress.goals.map((g) => `  [${g.type}] ${g.title}: ${g.current_value}/${g.target_value} ${g.unit}`).join('\n')
    : '  (no goals set)';

  const healthLines = health
    ? `Recovery data (Apple Health):
- HRV: ${health.hrv != null ? `${health.hrv} ms` : 'N/A'}
- Resting HR: ${health.restingHR != null ? `${health.restingHR} bpm` : 'N/A'}
- Sleep: ${health.sleepMinutes != null ? `${Math.round(health.sleepMinutes / 60 * 10) / 10} hours` : 'N/A'} (score: ${health.sleepScore ?? 'N/A'}/100)
- Readiness Score: ${health.readinessScore}/100
${health.hrv != null && health.readinessScore < 50 ? '⚠️ Recovery is below average — consider reducing volume or intensity today.' : ''}`
    : 'Recovery data: Not available (Apple Health not connected)';

  return `You are FitForge Coach, an expert AI fitness and nutrition coach. You have access to the user's live workout data, body metrics, nutrition logs, recovery data, and goals.

Your personality:
- Direct, encouraging, and knowledgeable
- You reference the user's actual data when giving advice
- You keep responses concise — this is a mobile chat interface
- You use fitness terminology naturally but explain when needed
- You proactively suggest adjustments based on readiness scores and recovery data
- When recovery is poor, recommend reducing intensity or volume with specific numbers
- When the user is ahead on goals, acknowledge progress and suggest stretch targets

IMPORTANT: You have tools that can modify app state. Use them when the user asks you to log sets, update targets, etc. Always confirm what you did after calling a tool.

When logging a set, use the exercise "id" field from the list below and calculate the next setNumber based on the number of completedSets.

Current user profile:
- Name: ${user.name}
- Level: ${user.level}
- Height: ${user.height}, Weight: ${user.weight} lb
- Training: ${user.trainingSplit}
- Progressive Overload: ${user.progressiveOverload ? 'ON' : 'OFF'}

${healthLines}

Current workout: ${workout.workoutName} (Day ${workout.dayNumber})
Readiness: ${workout.readinessScore}/100
Started: ${workout.workoutStartedAt ? 'Yes' : 'Not yet'}
Exercises:
${exerciseLines}

Nutrition targets: ${nutrition.calorieTarget} kcal — ${nutrition.proteinTarget}P / ${nutrition.carbsTarget}C / ${nutrition.fatTarget}F
Today's intake: ${nutrition.totalCalories} kcal — ${nutrition.totalProtein}P / ${nutrition.totalCarbs}C / ${nutrition.totalFat}F
Remaining: ${nutrition.calorieTarget - nutrition.totalCalories} kcal
Meals:
${mealLines || '  (none logged)'}

User goals:
${goalLines}

Key lifts:
${liftLines}
Body weight: ${progress.weight} lb
Streak: ${progress.streak} days`;
}

// ── API call ─────────────────────────────────────────────────────

export async function sendMessage(
  messages: Message[],
  state: AppStateSnapshot
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state);

  if (!API_KEY) {
    console.error('EXPO_PUBLIC_CLAUDE_API_KEY is not set');
    return {
      text: '⚠️ API key not configured. Set EXPO_PUBLIC_CLAUDE_API_KEY in your environment.',
      toolCalls: [],
    };
  }

  try {
    return await withRetry(async () => {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          tools: AI_TOOLS,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const apiError = classifyError(response.status, body);
        console.error(`Claude API [${response.status}]:`, body);
        throw apiError;
      }

      const data = await response.json();

      // Parse response content blocks
      let text = '';
      const toolCalls: ToolCall[] = [];

      for (const block of data.content || []) {
        if (block.type === 'text') {
          text += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      return { text, toolCalls };
    });
  } catch (error: any) {
    console.error('Claude API error:', error);
    // Return actionable error message based on error type
    const errorMessage = error?.type
      ? `⚠️ ${error.message}`
      : error?.message?.includes('Network request failed')
        ? '📡 Network error — check your connection and try again.'
        : `⚠️ Something went wrong: ${error?.message || 'Unknown error'}. Try again in a moment.`;
    return {
      text: errorMessage,
      toolCalls: [],
    };
  }
}

// ── Tool result follow-up ────────────────────────────────────────

export async function sendToolResults(
  originalMessages: Message[],
  state: AppStateSnapshot,
  toolCalls: ToolCall[],
  toolResults: Array<{ id: string; result: string }>
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state);

  // Build the full message history including the assistant's tool_use and our tool_results
  const apiMessages: any[] = originalMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Append the assistant message that contained tool_use blocks
  apiMessages.push({
    role: 'assistant',
    content: toolCalls.map((tc) => ({
      type: 'tool_use',
      id: tc.id,
      name: tc.name,
      input: tc.input,
    })),
  });

  // Append user message with tool_result blocks
  apiMessages.push({
    role: 'user',
    content: toolResults.map((tr) => ({
      type: 'tool_result',
      tool_use_id: tr.id,
      content: tr.result,
    })),
  });

  try {
    return await withRetry(async () => {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          tools: AI_TOOLS,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const apiError = classifyError(response.status, body);
        console.error(`Claude tool follow-up [${response.status}]:`, body);
        throw apiError;
      }

      const data = await response.json();

      let text = '';
      const newToolCalls: ToolCall[] = [];

      for (const block of data.content || []) {
        if (block.type === 'text') {
          text += block.text;
        } else if (block.type === 'tool_use') {
          newToolCalls.push({ id: block.id, name: block.name, input: block.input });
        }
      }

      return { text, toolCalls: newToolCalls };
    });
  } catch (error: any) {
    console.error('Claude tool result error:', error);
    const msg = error?.message || 'Failed to process tool results';
    return { text: `⚠️ ${msg}`, toolCalls: [] };
  }
}
