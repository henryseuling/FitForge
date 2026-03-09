import type { ToolCall } from './claude';

type WorkoutIntentName =
  | 'optimize_next_workout'
  | 'adjust_next_workout'
  | 'start_workout';

type WorkoutIntent = {
  name: WorkoutIntentName;
  input: Record<string, unknown>;
};

const FOCUS_ALIASES: Array<{ pattern: RegExp; focus: string }> = [
  { pattern: /\bpush\b|chest\b|press day/, focus: 'Push' },
  { pattern: /\bpull\b|back\b/, focus: 'Pull' },
  { pattern: /\blegs?\b|lower body|leg day/, focus: 'Legs' },
  { pattern: /\bupper\b|upper body/, focus: 'Upper' },
  { pattern: /\blower\b|lower body/, focus: 'Lower' },
  { pattern: /\bfull body\b/, focus: 'Full Body' },
  { pattern: /\bshoulders?\b/, focus: 'Shoulders' },
  { pattern: /\barms?\b/, focus: 'Arms' },
];

const INTENSITY_ALIASES: Array<{ pattern: RegExp; intensity: 'easy' | 'moderate' | 'hard' }> = [
  { pattern: /\blight\b|easy|deload|recovery/, intensity: 'easy' },
  { pattern: /\bhard\b|heavy|push it|intense/, intensity: 'hard' },
  { pattern: /\bmoderate\b|normal/, intensity: 'moderate' },
];

function normalizeMessage(text: string) {
  return text.trim().toLowerCase();
}

function inferFocus(text: string): string | undefined {
  for (const entry of FOCUS_ALIASES) {
    if (entry.pattern.test(text)) return entry.focus;
  }
  return undefined;
}

function inferIntensity(text: string): 'easy' | 'moderate' | 'hard' | undefined {
  for (const entry of INTENSITY_ALIASES) {
    if (entry.pattern.test(text)) return entry.intensity;
  }
  return undefined;
}

function inferAvailableTime(text: string): number | undefined {
  const minuteMatch = text.match(/(\d{2,3})\s*(min|mins|minute|minutes)\b/);
  if (minuteMatch) return Number(minuteMatch[1]);

  const hourMatch = text.match(/(\d)\s*(hour|hr)\b/);
  if (hourMatch) return Number(hourMatch[1]) * 60;

  return undefined;
}

function inferAvoidExercises(text: string): string[] {
  const avoidPatterns = [
    /avoid ([a-z0-9\s/-]+)/,
    /no ([a-z0-9\s/-]+)/,
    /without ([a-z0-9\s/-]+)/,
    /skip ([a-z0-9\s/-]+)/,
    /don't want ([a-z0-9\s/-]+)/,
  ];

  const found = new Set<string>();
  for (const pattern of avoidPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const cleaned = match[1]
      .split(/(?:,| and | but | today)/)[0]
      .trim()
      .replace(/^doing\s+/, '');
    if (cleaned) found.add(cleaned);
  }
  return Array.from(found);
}

function inferPreferredExercises(text: string): string[] {
  const preferPatterns = [
    /include ([a-z0-9\s/-]+)/,
    /prioritize ([a-z0-9\s/-]+)/,
    /focus on ([a-z0-9\s/-]+)/,
    /want ([a-z0-9\s/-]+)/,
  ];

  const found = new Set<string>();
  for (const pattern of preferPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const cleaned = match[1]
      .split(/(?:,| and | but | today)/)[0]
      .trim();
    if (cleaned) found.add(cleaned);
  }
  return Array.from(found);
}

function isStartWorkoutRequest(text: string) {
  return /\bstart( my| the)? workout\b|\blet'?s train\b|\bbegin workout\b/.test(text);
}

function isWorkoutPlanningRequest(text: string) {
  return [
    /what('?s| is) my next workout/,
    /what should i do today/,
    /build (me )?(a )?workout/,
    /create (me )?(a )?workout/,
    /plan (my )?(next )?workout/,
    /what('?s| is) today'?s workout/,
    /what do i train/,
  ].some((pattern) => pattern.test(text));
}

function isWorkoutAdjustmentRequest(text: string) {
  return [
    /make it \d+/,
    /make (my |the )?workout/,
    /adjust (my |the )?workout/,
    /change (my |the )?workout/,
    /swap /,
    /replace /,
    /avoid /,
    /without /,
    /skip /,
    /i only have \d+/,
    /shorter workout/,
    /longer workout/,
  ].some((pattern) => pattern.test(text));
}

export function inferWorkoutIntent(message: string): WorkoutIntent | null {
  const text = normalizeMessage(message);

  if (isStartWorkoutRequest(text)) {
    return { name: 'start_workout', input: {} };
  }

  const input: Record<string, unknown> = {
    instruction: message.trim(),
  };

  const desiredFocus = inferFocus(text);
  if (desiredFocus) input.desiredFocus = desiredFocus;

  const availableTime = inferAvailableTime(text);
  if (availableTime) input.availableTime = availableTime;

  const intensity = inferIntensity(text);
  if (intensity) input.intensity = intensity;

  const avoidExercises = inferAvoidExercises(text);
  if (avoidExercises.length > 0) input.avoidExercises = avoidExercises;

  const preferredExercises = inferPreferredExercises(text);
  if (preferredExercises.length > 0) input.preferredExercises = preferredExercises;

  if (isWorkoutAdjustmentRequest(text)) {
    return { name: 'adjust_next_workout', input };
  }

  if (isWorkoutPlanningRequest(text)) {
    return { name: 'optimize_next_workout', input };
  }

  return null;
}

export function createDeterministicWorkoutToolCall(message: string): ToolCall | null {
  const intent = inferWorkoutIntent(message);
  if (!intent) return null;

  return {
    id: `deterministic-${Date.now()}`,
    name: intent.name,
    input: intent.input,
  };
}
