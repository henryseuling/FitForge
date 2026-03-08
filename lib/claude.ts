// Claude AI Coach client — with tool use support

import { AI_TOOLS } from './aiTools';
import {
  invokeChatAI,
  invokeToolFollowUpAI,
  invokeStreamingChatAI,
  type AIModelPreference,
  type StreamCallbacks,
} from './aiGateway';
import type { CoachContext } from './coachMemory';
import {
  buildWorkoutAgentDirective,
  buildWorkoutInteractionLayer,
  buildWorkoutAgentProfileFromChat,
  formatWorkoutAgentSection,
} from './workoutAgent';
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
    readinessScore: number | null;
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
  health?: {
    hrv: number | null;
    restingHR: number | null;
    sleepScore: number | null;
    recoveryScore: number | null;
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
  const { user, workout, nutrition, progress, health } = state;
  const hasLoadedWorkout = workout.exercises.length > 0 || Boolean(workout.workoutName);
  const isActiveWorkout = Boolean(workout.workoutStartedAt) || workout.exercises.length > 0;
  const workoutAgent = buildWorkoutAgentProfileFromChat(state, coachContext);

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

  const upcomingWorkoutLines = coachContext.upcomingWorkout
    ? coachContext.upcomingWorkout.exercises
        .map(
          (exercise) =>
            `  ${exercise.name} (${exercise.muscleGroup}) — ${exercise.sets} sets of ${exercise.repsMin}${exercise.repsMax !== exercise.repsMin ? `-${exercise.repsMax}` : ''} reps @ ${exercise.weight || '?'}lb`
        )
        .join('\n')
    : '';

  const healthLines = health
    ? [
        health.hrv != null ? `- HRV: ${health.hrv} ms` : '',
        health.restingHR != null ? `- Resting HR: ${health.restingHR} bpm` : '',
        health.sleepScore != null ? `- Sleep score: ${health.sleepScore}/100` : '',
        health.recoveryScore != null ? `- Recovery score: ${health.recoveryScore}/100` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const upcomingWorkoutSection = coachContext.upcomingWorkout
    ? `Upcoming workout draft:
- Name: ${coachContext.upcomingWorkout.workoutName}
- Day: ${coachContext.upcomingWorkout.dayNumber || 'Next available'}
- Split: ${coachContext.upcomingWorkout.splitType || 'Planned session'}
${coachContext.upcomingWorkout.sessionNotes ? `- Notes: ${coachContext.upcomingWorkout.sessionNotes}\n` : ''}${upcomingWorkoutLines || '  (no draft exercises available)'}`
    : 'Upcoming workout draft:\n  (none available yet)';

  return `You are FitForge Coach, an expert AI fitness and nutrition coach. You have access to the user's live workout data, body metrics, and nutrition logs.

${buildWorkoutAgentDirective(workoutAgent, 'chat')}
${buildWorkoutInteractionLayer()}

Your personality:
- Direct, sharp, and high-context
- You sound like the same coach across sessions, not a generic chatbot
- You reference the user's real performance, recovery, and preferences before giving advice
- You keep responses concise because this is a mobile chat interface
- You proactively suggest the next best action based on readiness and the upcoming session

OPERATING RULES:
- Chat is the user's primary control surface. Prefer taking action with tools over telling the user to navigate elsewhere.
- Use tools when the user asks to log sets, meals, water, profile changes, goals, or workout edits.
- If the user asks what their next workout is, asks for a workout to be created, or wants the upcoming session changed, use the workout optimization tools instead of saying you cannot.
- Never say you need a workout to be manually loaded before you can help. Build, adjust, or start the upcoming workout through tools.
- Treat requests like "what should I do today?", "what's next?", "make it 45 minutes", "avoid squats", "change tomorrow to lower body", and "start my workout" as app-control requests.
- If the user states a durable preference, limitation, dislike, injury, or schedule constraint, save it with remember_preference.
- If confidence is low, ask exactly one short clarifying question instead of guessing.
- Always confirm what you changed after calling a tool.
- Do not give generic workout advice if athlete-specific context below is sufficient to be specific.
- ${isActiveWorkout ? 'This athlete is in or near an active workout right now. Keep replies tight and action-oriented.' : 'If the athlete is not actively lifting, you can be slightly more explanatory, but still concise.'}

When logging a set, use the exercise "id" field from the list below and calculate the next setNumber based on the number of completedSets.

${formatWorkoutAgentSection(workoutAgent)}

Current user profile:
- Name: ${user.name}
- Level: ${user.level}
- Height: ${user.height}, Weight: ${user.weight} lb
- Training: ${user.trainingSplit}
- Progressive Overload: ${user.progressiveOverload ? 'ON' : 'OFF'}

Current workout: ${hasLoadedWorkout ? `${workout.workoutName} (Day ${workout.dayNumber || '?'})` : 'No active workout loaded'}
Readiness: ${workout.readinessScore}/100
Started: ${workout.workoutStartedAt ? 'Yes' : 'Not yet'}
Exercises:
${exerciseLines || '  (none loaded)'}

Nutrition targets: ${nutrition.calorieTarget} kcal — ${nutrition.proteinTarget}P / ${nutrition.carbsTarget}C / ${nutrition.fatTarget}F
Today's intake: ${nutrition.totalCalories} kcal — ${nutrition.totalProtein}P / ${nutrition.totalCarbs}C / ${nutrition.totalFat}F
Remaining: ${nutrition.calorieTarget - nutrition.totalCalories} kcal
Meals:
${mealLines || '  (none logged)'}

Key lifts:
${liftLines}
Body weight: ${progress.weight} lb
Streak: ${progress.streak} days

Latest health context:
${healthLines || '  (no live health metrics synced yet)'}

Durable coach memory:
${memoryLines || '  (none saved yet)'}

Active goals:
${goalLines || '  (none set)'}

Exercise intelligence:
${profileLines || '  (no calibrated exercise profiles yet)'}

Recent coaching observations:
${observationLines || '  (none yet)'}

Next-session plan:
${nextPlanLines || '  (not generated yet)'}

${upcomingWorkoutSection}`;
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

function normalizeGatewayContent(data: unknown): GatewayContentBlock[] {
  if (Array.isArray(data)) {
    return data as GatewayContentBlock[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.content)) {
      return record.content as GatewayContentBlock[];
    }

    if (record.content && typeof record.content === 'object') {
      return [record.content as GatewayContentBlock];
    }

    if (typeof record.text === 'string' && record.text.trim()) {
      return [{ type: 'text', text: record.text }];
    }

    if (record.data && typeof record.data === 'object') {
      return normalizeGatewayContent(record.data);
    }
  }

  return [];
}

function prefersWorkoutModel(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'next workout',
    'today workout',
    'workout today',
    'build workout',
    'create workout',
    'plan workout',
    'adjust workout',
    'change workout',
    'swap exercise',
    'replace exercise',
    'avoid squat',
    'avoid bench',
    'lower body',
    'upper body',
    'push day',
    'pull day',
    'leg day',
    'make it 45',
    'make it 60',
    'what should i do today',
    'what should i train',
    'start my workout',
    'change tomorrow',
    'shorter workout',
    'longer workout',
    'avoid ',
    'without ',
    'skip ',
  ].some((phrase) => normalized.includes(phrase));
}

// Tool-use keywords that indicate the message needs Sonnet (not Haiku)
const TOOL_USE_KEYWORDS = [
  'log', 'set', 'update', 'change', 'add', 'remove', 'delete', 'track',
  'record', 'save', 'workout', 'meal', 'water', 'weight', 'goal',
  'remember', 'swap', 'replace', 'start', 'plan', 'build', 'create',
  'adjust', 'avoid', 'skip', 'next', 'calori', 'macro', 'protein',
];

export function shouldUseFastModel(message: string): boolean {
  const words = message.trim().split(/\s+/);
  if (words.length >= 15) return false;
  const lower = message.toLowerCase();
  return !TOOL_USE_KEYWORDS.some((kw) => lower.includes(kw));
}

function getFollowUpModelPreference(toolCalls: ToolCall[]): AIModelPreference {
  return toolCalls.some(
    (toolCall) => toolCall.name === 'optimize_next_workout' || toolCall.name === 'adjust_next_workout'
  )
    ? 'workout'
    : 'default';
}

/** Trim messages to the last N (keeping alternating user/assistant pairs). */
export function trimHistory(messages: Message[], maxMessages = 20): Message[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

export async function sendMessageStreaming(
  messages: Message[],
  state: AppStateSnapshot,
  coachContext: CoachContext,
  callbacks: {
    onToken: (text: string) => void;
    preferFastModel?: boolean;
    signal?: AbortSignal;
  }
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state, coachContext);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

  let modelPreference: AIModelPreference = prefersWorkoutModel(latestUserMessage) ? 'workout' : 'default';
  if (modelPreference === 'default' && callbacks.preferFastModel && shouldUseFastModel(latestUserMessage)) {
    modelPreference = 'fast';
  }

  const trimmed = trimHistory(messages);

  try {
    let accumulatedText = '';
    const toolCalls: ToolCall[] = [];

    const data = await invokeStreamingChatAI(
      {
        systemPrompt,
        tools: AI_TOOLS,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
        maxTokens: 640,
        modelPreference,
      },
      {
        onToken: (text) => {
          accumulatedText += text;
          callbacks.onToken(text);
        },
        onToolUse: (block) => {
          toolCalls.push({ id: block.id, name: block.name, input: block.input });
        },
        signal: callbacks.signal,
      }
    );

    // Also check content blocks for any text/tools not caught by stream
    const contentBlocks = normalizeGatewayContent(data);
    for (const block of contentBlocks) {
      if (isTextBlock(block) && !accumulatedText.includes(block.text)) {
        accumulatedText += block.text;
      } else if (isToolUseBlock(block) && !toolCalls.some((tc) => tc.id === block.id)) {
        toolCalls.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    return { text: accumulatedText, toolCalls };
  } catch (error) {
    // If streaming fails, fall back to non-streaming
    if (error instanceof Error && error.name === 'AbortError') {
      return { text: '', toolCalls: [] };
    }
    console.warn('Streaming failed, falling back to batch:', error);
    return sendMessage(messages, state, coachContext, { preferFastModel: callbacks.preferFastModel });
  }
}

export async function sendMessage(
  messages: Message[],
  state: AppStateSnapshot,
  coachContext: CoachContext,
  options?: { preferFastModel?: boolean }
): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(state, coachContext);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

  let modelPreference: AIModelPreference = prefersWorkoutModel(latestUserMessage) ? 'workout' : 'default';
  if (modelPreference === 'default' && options?.preferFastModel && shouldUseFastModel(latestUserMessage)) {
    modelPreference = 'fast';
  }

  const trimmed = trimHistory(messages);

  try {
    const data = await invokeChatAI({
      systemPrompt,
      tools: AI_TOOLS,
      messages: trimmed.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      maxTokens: 640,
      modelPreference,
    });
    const contentBlocks = normalizeGatewayContent(data);

    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of contentBlocks) {
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
    const message = error instanceof Error ? error.message : 'AI request failed';
    return {
      text: `Chat failed: ${message}`,
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
  const trimmed = trimHistory(originalMessages);

  try {
    const data = await invokeToolFollowUpAI({
      systemPrompt,
      tools: AI_TOOLS,
      messages: trimmed.map((m) => ({
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
      maxTokens: 512,
      modelPreference: getFollowUpModelPreference(toolCalls),
    });
    const contentBlocks = normalizeGatewayContent(data);

    let text = '';
    const newToolCalls: ToolCall[] = [];

    for (const block of contentBlocks) {
      if (isTextBlock(block)) {
        text += block.text;
      } else if (isToolUseBlock(block)) {
        newToolCalls.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    return { text, toolCalls: newToolCalls };
  } catch (error) {
    console.error('Claude tool result error:', error);
    const message = error instanceof Error ? error.message : 'AI follow-up failed';
    return { text: `Tool follow-up failed: ${message}`, toolCalls: [] };
  }
}
