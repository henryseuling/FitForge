// Claude AI Coach client — with tool use support

import { AI_TOOLS } from './aiTools';
import { invokeChatAI, invokeToolFollowUpAI } from './aiGateway';
import type { CoachContext } from './coachMemory';
import type { Meal } from '@/stores/useNutritionStore';
import type { KeyLift } from '@/stores/useProgressStore';
import type { Exercise } from '@/stores/useWorkoutStore';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeResponse {
  text: string;
  toolCalls: ToolCall[];
}

interface GatewayTextBlock {
  type: 'text';
  text: string;
}

interface GatewayToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type GatewayContentBlock = GatewayTextBlock | GatewayToolUseBlock | { type: string };

function formatExercise(ex: Exercise, idx: number, activeIdx: number): string {
  const status = ex.completedSets.length >= ex.sets ? '✓ done' : `${ex.completedSets.length}/${ex.sets} sets`;
  const active = idx === activeIdx ? ' ← ACTIVE' : '';
  return `  [${idx}] ${ex.name} (${ex.muscleGroup}) — ${ex.weight}lb × ${ex.repsMin}-${ex.repsMax} reps — ${status}${active}  (id: "${ex.id}")`;
}

export function buildSystemPrompt(state: AppStateSnapshot, coachContext: CoachContext): string {
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

  const memoryLines = coachContext.memories
    .map((memory) => `  [${memory.category}] ${memory.content}`)
    .join('\n');

  const goalLines = coachContext.goals
    .map((goal) => `  ${goal.title}: ${goal.current_value}/${goal.target_value} ${goal.unit}`)
    .join('\n');

  const profileLines = coachContext.exerciseProfiles
    .map((profile) => {
      const tags = [profile.is_favorite ? 'favorite' : '', profile.is_disliked ? 'avoid' : ''].filter(Boolean);
      return `  ${profile.exercise_name}: working ${profile.current_working_weight ?? '?'}lb, est 1RM ${profile.estimated_1rm ?? '?'}lb${tags.length ? ` (${tags.join(', ')})` : ''}${profile.notes ? ` — ${profile.notes}` : ''}`;
    })
    .join('\n');

  const observationLines = coachContext.recentObservations
    .map((observation) => `  [${observation.category}] ${observation.observation}`)
    .join('\n');

  const nextPlanLines = coachContext.nextSessionPlan
    ? [
        coachContext.nextSessionPlan.split_type ? `  Focus: ${coachContext.nextSessionPlan.split_type}` : '',
        coachContext.nextSessionPlan.coach_notes ? `  Notes: ${coachContext.nextSessionPlan.coach_notes}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return `You are FitForge Coach, an expert AI fitness and nutrition coach. You have access to the user's live workout data, body metrics, and nutrition logs.

Your personality:
- Direct, encouraging, and knowledgeable
- You reference the user's actual data when giving advice
- You keep responses concise — this is a mobile chat interface
- You use fitness terminology naturally but explain when needed
- You proactively suggest adjustments based on readiness scores and recovery data

OPERATING RULES:
- Chat is the user's primary control surface. Prefer taking action with tools over telling the user to navigate elsewhere.
- Use tools when the user asks to log sets, meals, water, profile changes, goals, or workout edits.
- If the user states a durable preference, limitation, dislike, injury, or schedule constraint, save it with remember_preference.
- If confidence is low, ask exactly one short clarifying question instead of guessing.
- Always confirm what you changed after calling a tool.

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
Streak: ${progress.streak} days

Durable coach memory:
${memoryLines || '  (none saved yet)'}

Active goals:
${goalLines || '  (none set)'}

Exercise intelligence:
${profileLines || '  (no calibrated exercise profiles yet)'}

Recent coaching observations:
${observationLines || '  (none yet)'}

Next-session plan:
${nextPlanLines || '  (not generated yet)'}`;
}

function isToolUseBlock(block: GatewayContentBlock): block is GatewayToolUseBlock {
  return (
    block.type === 'tool_use' &&
    typeof (block as Partial<GatewayToolUseBlock>).id === 'string' &&
    typeof (block as Partial<GatewayToolUseBlock>).name === 'string' &&
    typeof (block as Partial<GatewayToolUseBlock>).input === 'object' &&
    (block as Partial<GatewayToolUseBlock>).input !== null
  );
}

function isTextBlock(block: GatewayContentBlock): block is GatewayTextBlock {
  return block.type === 'text' && typeof (block as Partial<GatewayTextBlock>).text === 'string';
}

export async function sendMessage(
  messages: Message[],
  state: AppStateSnapshot,
  coachContext: CoachContext
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state, coachContext);

  try {
    const data = await invokeChatAI({
      systemPrompt,
      tools: AI_TOOLS,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxTokens: 1024,
    });

    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content as GatewayContentBlock[]) {
      if (isTextBlock(block)) {
        text += block.text;
      } else if (isToolUseBlock(block)) {
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

export async function sendToolResults(
  originalMessages: Message[],
  state: AppStateSnapshot,
  coachContext: CoachContext,
  toolCalls: ToolCall[],
  toolResults: Array<{ id: string; result: string }>
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state, coachContext);

  try {
    const data = await invokeToolFollowUpAI({
      systemPrompt,
      tools: AI_TOOLS,
      messages: originalMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      toolCalls: toolCalls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: tc.input,
      })),
      toolResults: toolResults.map((tr) => ({
        type: 'tool_result',
        tool_use_id: tr.id,
        content: tr.result,
      })),
      maxTokens: 1024,
    });

    let text = '';
    const newToolCalls: ToolCall[] = [];

    for (const block of (data.content || []) as GatewayContentBlock[]) {
      if (isTextBlock(block)) {
        text += block.text;
      } else if (isToolUseBlock(block)) {
        newToolCalls.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    return { text, toolCalls: newToolCalls };
  } catch (error) {
    console.error('Claude tool result error:', error);
    return { text: '', toolCalls: [] };
  }
}
