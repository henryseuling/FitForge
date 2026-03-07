import Papa from 'papaparse';
import { extractJsonPayload } from './json';

export type ParsedSet = {
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
  rpe: number | null;
  duration: number | null;
  distance: number | null;
  notes: string;
};

export type ParsedExercise = {
  name: string;
  sets: ParsedSet[];
};

export type ParsedWorkout = {
  date: string;
  workoutName: string;
  exercises: ParsedExercise[];
};

const KG_TO_LBS = 2.205;

type Source = 'strong' | 'fitbod' | 'hevy' | 'csv' | 'json';

const FIELD_ALIASES: Record<string, string[]> = {
  date: ['date', 'workout date', 'start_time', 'start time', 'started at', 'started_at', 'timestamp'],
  workoutName: ['workout name', 'workout', 'title', 'session name', 'routine'],
  exerciseName: ['exercise name', 'exercise', 'exercise_title', 'movement', 'lift', 'name'],
  setNumber: ['set order', 'set_number', 'set number', 'set', 'set_index', 'order'],
  weight: ['weight', 'weight_kg', 'weight (kg)', 'weight lbs', 'weight_lbs', 'lbs', 'kg'],
  reps: ['reps', 'rep', 'repetitions'],
  isWarmup: ['iswarmup', 'is_warmup', 'warmup', 'warm-up', 'set_type'],
  rpe: ['rpe', 'rir'],
  duration: ['duration', 'duration_seconds', 'seconds', 'time'],
  distance: ['distance', 'distance_km', 'distance_mi'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCSV(text: string): any[] {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => header.replace(/^\ufeff/, '').trim(),
  });

  if (result.errors?.length && result.data.length === 0) {
    throw new Error(result.errors[0].message || 'Failed to parse CSV');
  }

  return (result.data as any[]).filter((row) =>
    Object.values(row || {}).some((value) => value !== null && value !== undefined && String(value).trim() !== '')
  );
}

function num(value: any, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return fallback;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function str(value: any, fallback = ''): string {
  return value != null ? String(value).trim() : fallback;
}

function truthyWarmup(value: any): boolean {
  const normalized = str(value).toLowerCase();
  return value === true || value === 1 || normalized === 'true' || normalized === 'warmup' || normalized === 'warm-up';
}

function getByAlias(row: Record<string, any>, field: keyof typeof FIELD_ALIASES): any {
  const keys = Object.keys(row || {});
  const normalizedMap = new Map(keys.map((key) => [normalizeHeader(key), key]));

  for (const alias of FIELD_ALIASES[field]) {
    const exact = normalizedMap.get(normalizeHeader(alias));
    if (exact && row[exact] !== undefined) {
      return row[exact];
    }
  }

  return undefined;
}

function groupRows<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(row);
  }
  return map;
}

function buildExercises(
  rows: any[],
  getExerciseName: (row: any) => string,
  toSet: (row: any, index: number) => ParsedSet
): ParsedExercise[] {
  const exerciseMap = new Map<string, ParsedSet[]>();

  for (const row of rows) {
    const name = getExerciseName(row);
    if (!name) continue;
    if (!exerciseMap.has(name)) {
      exerciseMap.set(name, []);
    }
    const sets = exerciseMap.get(name)!;
    sets.push(toSet(row, sets.length));
  }

  return Array.from(exerciseMap.entries())
    .map(([name, sets]) => ({
      name,
      sets: sets.filter((set) => set.reps > 0 || set.weight > 0 || set.duration != null || set.distance != null),
    }))
    .filter((exercise) => exercise.sets.length > 0);
}

function sanitizeParsedWorkouts(workouts: ParsedWorkout[]): ParsedWorkout[] {
  return workouts
    .map((workout) => ({
      date: str(workout.date, new Date().toISOString()),
      workoutName: str(workout.workoutName, 'Workout'),
      exercises: (workout.exercises || [])
        .map((exercise) => ({
          name: str(exercise.name, 'Unknown Exercise'),
          sets: (exercise.sets || []).map((set, index) => ({
            setNumber: num(set.setNumber, index + 1),
            weight: Math.max(0, num(set.weight)),
            reps: Math.max(0, num(set.reps)),
            isWarmup: Boolean(set.isWarmup),
            rpe: set.rpe != null ? num(set.rpe) : null,
            duration: set.duration != null ? num(set.duration) : null,
            distance: set.distance != null ? num(set.distance) : null,
            notes: str(set.notes),
          })),
        }))
        .filter((exercise) => exercise.name && exercise.sets.length > 0),
    }))
    .filter((workout) => workout.exercises.length > 0);
}

function inferGenericColumnMapping(rows: any[]): Record<string, string> {
  const firstRow = rows[0] || {};
  const keys = Object.keys(firstRow);
  const mapping: Record<string, string> = {};

  for (const field of Object.keys(FIELD_ALIASES)) {
    const match = keys.find((key) =>
      FIELD_ALIASES[field].some((alias) => normalizeHeader(alias) === normalizeHeader(key))
    );
    if (match) {
      mapping[field] = match;
    }
  }

  return mapping;
}

function normalizeDate(value: any): string {
  const raw = str(value);
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return raw;
}

export function parseStrongCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(rows, (row) => {
    const date = getByAlias(row, 'date') ?? row['Date'];
    const workoutName = getByAlias(row, 'workoutName') ?? row['Workout Name'];
    return `${str(date)}||${str(workoutName, 'Workout')}`;
  });

  return sanitizeParsedWorkouts(
    Array.from(grouped.entries()).map(([key, workoutRows]) => {
      const [date, workoutName] = key.split('||');
      return {
        date: normalizeDate(date),
        workoutName: str(workoutName, 'Workout'),
        exercises: buildExercises(
          workoutRows,
          (row) => str(getByAlias(row, 'exerciseName') ?? row['Exercise Name']),
          (row, index) => ({
            setNumber: num(getByAlias(row, 'setNumber') ?? row['Set Order'], index + 1),
            weight: num(getByAlias(row, 'weight') ?? row['Weight']),
            reps: num(getByAlias(row, 'reps') ?? row['Reps']),
            isWarmup: truthyWarmup(getByAlias(row, 'isWarmup')),
            rpe: getByAlias(row, 'rpe') != null ? num(getByAlias(row, 'rpe')) : null,
            duration: getByAlias(row, 'duration') != null ? num(getByAlias(row, 'duration')) : null,
            distance: getByAlias(row, 'distance') != null ? num(getByAlias(row, 'distance')) : null,
            notes: str(getByAlias(row, 'notes')),
          })
        ),
      };
    })
  );
}

export function parseFitbodCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(rows, (row) => str(getByAlias(row, 'date') ?? row['Date'], 'Unknown Date'));

  return sanitizeParsedWorkouts(
    Array.from(grouped.entries()).map(([date, workoutRows]) => ({
      date: normalizeDate(date),
      workoutName: str(getByAlias(workoutRows[0], 'workoutName'), 'Fitbod Workout'),
      exercises: buildExercises(
        workoutRows,
        (row) => str(getByAlias(row, 'exerciseName') ?? row['Exercise']),
        (row, index) => ({
          setNumber: num(getByAlias(row, 'setNumber'), index + 1),
          weight: num(getByAlias(row, 'weight') ?? row['Weight']),
          reps: num(getByAlias(row, 'reps') ?? row['Reps']),
          isWarmup: truthyWarmup(getByAlias(row, 'isWarmup')),
          rpe: getByAlias(row, 'rpe') != null ? num(getByAlias(row, 'rpe')) : null,
          duration: getByAlias(row, 'duration') != null ? num(getByAlias(row, 'duration')) : null,
          distance: getByAlias(row, 'distance') != null ? num(getByAlias(row, 'distance')) : null,
          notes: str(getByAlias(row, 'notes') ?? row['Note']),
        })
      ),
    }))
  );
}

export function parseHevyCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(rows, (row) => {
    const date = getByAlias(row, 'date') ?? row['start_time'];
    const workoutName = getByAlias(row, 'workoutName') ?? row['title'];
    return `${str(date)}||${str(workoutName, 'Hevy Workout')}`;
  });

  return sanitizeParsedWorkouts(
    Array.from(grouped.entries()).map(([key, workoutRows]) => {
      const [startTime, title] = key.split('||');
      return {
        date: normalizeDate(startTime),
        workoutName: str(title, 'Hevy Workout'),
        exercises: buildExercises(
          workoutRows,
          (row) => str(getByAlias(row, 'exerciseName') ?? row['exercise_title']),
          (row, index) => {
            const rawWeight = getByAlias(row, 'weight') ?? row['weight_kg'];
            const normalizedWeight =
              normalizeHeader(Object.keys(row).find((key) => row[key] === rawWeight) || '').includes('kg')
                ? Math.round(num(rawWeight) * KG_TO_LBS * 100) / 100
                : num(rawWeight);

            return {
              setNumber: num(getByAlias(row, 'setNumber') ?? row['set_index'], index + 1),
              weight: normalizedWeight,
              reps: num(getByAlias(row, 'reps') ?? row['reps']),
              isWarmup: truthyWarmup(getByAlias(row, 'isWarmup') ?? row['set_type']),
              rpe: getByAlias(row, 'rpe') != null ? num(getByAlias(row, 'rpe')) : null,
              duration: getByAlias(row, 'duration') != null ? num(getByAlias(row, 'duration')) : null,
              distance: getByAlias(row, 'distance') != null ? num(getByAlias(row, 'distance')) : null,
              notes: str(getByAlias(row, 'notes')),
            };
          }
        ),
      };
    })
  );
}

export function parseGenericCSV(text: string, columnMapping: Record<string, string> = {}): ParsedWorkout[] {
  const rows = parseCSV(text);
  const inferred = { ...inferGenericColumnMapping(rows), ...columnMapping };

  const col = (row: any, field: string): any => {
    const mappedColumn = inferred[field];
    if (mappedColumn && row[mappedColumn] !== undefined) {
      return row[mappedColumn];
    }
    return getByAlias(row, field as keyof typeof FIELD_ALIASES);
  };

  const grouped = groupRows(rows, (row) => {
    const date = str(col(row, 'date'), 'Unknown Date');
    const workoutName = str(col(row, 'workoutName'), 'Workout');
    return `${date}||${workoutName}`;
  });

  return sanitizeParsedWorkouts(
    Array.from(grouped.entries()).map(([key, workoutRows]) => {
      const [date, workoutName] = key.split('||');
      return {
        date: normalizeDate(date),
        workoutName: str(workoutName, 'Workout'),
        exercises: buildExercises(
          workoutRows,
          (row) => str(col(row, 'exerciseName'), 'Unknown Exercise'),
          (row, index) => ({
            setNumber: num(col(row, 'setNumber'), index + 1),
            weight: num(col(row, 'weight')),
            reps: num(col(row, 'reps')),
            isWarmup: truthyWarmup(col(row, 'isWarmup')),
            rpe: col(row, 'rpe') != null ? num(col(row, 'rpe')) : null,
            duration: col(row, 'duration') != null ? num(col(row, 'duration')) : null,
            distance: col(row, 'distance') != null ? num(col(row, 'distance')) : null,
            notes: str(col(row, 'notes')),
          })
        ),
      };
    })
  );
}

function unwrapWorkoutPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON format: expected an array or object');
  }

  if (Array.isArray(data.workouts)) return data.workouts;
  if (Array.isArray(data.sessions)) return data.sessions;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.history)) return data.history;

  return [data];
}

export function parseJSON(text: string): ParsedWorkout[] {
  const data = extractJsonPayload<any>(text);
  const workouts = unwrapWorkoutPayload(data).map((item) => normalizeWorkout(item));
  return sanitizeParsedWorkouts(workouts);
}

function normalizeWorkout(item: any): ParsedWorkout {
  return {
    date: normalizeDate(item.date || item.started_at || item.start_time || item.timestamp),
    workoutName: str(item.workoutName || item.workout_name || item.name || item.title, 'Workout'),
    exercises: Array.isArray(item.exercises)
      ? item.exercises.map((exercise: any) => normalizeExercise(exercise))
      : Array.isArray(item.movements)
        ? item.movements.map((exercise: any) => normalizeExercise(exercise))
        : [],
  };
}

function normalizeExercise(exercise: any): ParsedExercise {
  const rawSets = Array.isArray(exercise.sets)
    ? exercise.sets
    : Array.isArray(exercise.entries)
      ? exercise.entries
      : Array.isArray(exercise.performance)
        ? exercise.performance
        : [];

  return {
    name: str(exercise.name || exercise.exercise || exercise.exerciseName || exercise.title, 'Unknown Exercise'),
    sets: rawSets.map((set: any, index: number) => normalizeSet(set, index)),
  };
}

function normalizeSet(set: any, index: number): ParsedSet {
  return {
    setNumber: num(set.setNumber ?? set.set_number ?? set.order, index + 1),
    weight: num(set.weight ?? set.load ?? set.weight_lbs ?? set.weight_kg),
    reps: num(set.reps ?? set.rep_count ?? set.repetitions),
    isWarmup: truthyWarmup(set.isWarmup ?? set.is_warmup ?? set.type),
    rpe: set.rpe != null ? num(set.rpe) : set.rir != null ? num(set.rir) : null,
    duration: set.duration != null ? num(set.duration) : set.seconds != null ? num(set.seconds) : null,
    distance: set.distance != null ? num(set.distance) : null,
    notes: str(set.notes ?? set.note),
  };
}

export function parseImportText(source: Source, text: string): ParsedWorkout[] {
  switch (source) {
    case 'strong':
      return parseStrongCSV(text);
    case 'fitbod':
      return parseFitbodCSV(text);
    case 'hevy':
      return parseHevyCSV(text);
    case 'json':
      return parseJSON(text);
    case 'csv':
      return parseGenericCSV(text, {});
    default:
      return [];
  }
}
