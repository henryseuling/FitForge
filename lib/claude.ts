// Claude AI Coach client — with tool use support
// NOTE: In production, API calls should go through your backend server
// to keep the API key secure. This is a simplified client for development.

import { AI_TOOLS } from './aiTools';
import type { Exercise } from '@/stores/useWorkoutStore';
import type { Meal } from '@/stores/useNutritionStore';
import type { KeyLift } from '@/stores/useProgressStore';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// TODO: Move to backend — never ship API keys in a mobile app
const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

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
  const { user, workout, nutrition, progress } = state;

  const exerciseLines = workout.exercises
    .map((ex, i) => formatExercise(ex, i, workout.activeExerciseIndex))
    .join('\n');

  const mealLines = nutrition.meals
    .map((m) => `  ${m.type} (${m.time}): ${m.totalCalories} kcal — ${m.protein}P/${m.carbs}C/${m.fat}F — ${m.foods.map((f) => f.name).join(', ')}`)
    .join('\n');

  const liftLines = progress.keyLifts
    .map((l) => `  ${l.name}: ${l.weight} ${l.unit} (${l.delta >= 0 ? '+' : ''}${l.delta})`)
    .join('\n');

  return `You are FitForge Coach, an expert AI fitness and nutrition coach. You have access to the user's live workout data, body metrics, and nutrition logs.

Your personality:
- Direct, encouraging, and knowledgeable
- You reference the user's actual data when giving advice
- You keep responses concise — this is a mobile chat interface
- You use fitness terminology naturally but explain when needed
- You proactively suggest adjustments based on readiness scores and recovery data

IMPORTANT: You have tools that can modify app state. Use them when the user asks you to log sets, update targets, etc. Always confirm what you did after calling a tool.

When logging a set, use the exercise "id" field from the list below and calculate the next setNumber based on the number of completedSets.

Current user profile:
- Name: ${user.name}
- Level: ${user.level}
- Height: ${user.height}, Weight: ${user.weight} lb
- Training: ${user.trainingSplit}
- Progressive Overload: ${user.progressiveOverload ? 'ON' : 'OFF'}

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

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse response content blocks
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
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
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      text: "Sorry, I couldn't connect right now. Try again in a moment.",
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
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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
  } catch (error) {
    console.error('Claude tool result error:', error);
    return { text: '', toolCalls: [] };
  }
}
