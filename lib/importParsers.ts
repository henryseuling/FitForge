import Papa from 'papaparse';

// ---------- Types ----------

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

// ---------- Helpers ----------

function parseCSV(text: string): any[] {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  return result.data as any[];
}

function num(value: any, fallback: number = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

function str(value: any, fallback: string = ''): string {
  return value != null ? String(value) : fallback;
}

function groupRows<T>(
  rows: T[],
  keyFn: (row: T) => string
): Map<string, T[]> {
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
  const exercises: ParsedExercise[] = [];
  for (const [name, sets] of exerciseMap) {
    exercises.push({ name, sets });
  }
  return exercises;
}

// ---------- Strong CSV Parser ----------

export function parseStrongCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(rows, (r) => `${r['Date']}||${r['Workout Name']}`);
  const workouts: ParsedWorkout[] = [];

  for (const [key, workoutRows] of grouped) {
    const [date, workoutName] = key.split('||');
    const exercises = buildExercises(
      workoutRows,
      (r) => str(r['Exercise Name']),
      (r, i) => ({
        setNumber: num(r['Set Order'], i + 1),
        weight: num(r['Weight']),
        reps: num(r['Reps']),
        isWarmup: false,
        rpe: r['RPE'] != null ? num(r['RPE']) : null,
        duration: r['Seconds'] != null ? num(r['Seconds']) : null,
        distance: r['Distance'] != null ? num(r['Distance']) : null,
        notes: str(r['Notes']),
      })
    );

    workouts.push({
      date: str(date),
      workoutName: str(workoutName, 'Workout'),
      exercises,
    });
  }

  return workouts;
}

// ---------- Fitbod CSV Parser ----------

export function parseFitbodCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(rows, (r) => str(r['Date']));
  const workouts: ParsedWorkout[] = [];

  for (const [date, workoutRows] of grouped) {
    const exercises = buildExercises(
      workoutRows,
      (r) => str(r['Exercise']),
      (r, i) => ({
        setNumber: i + 1,
        weight: num(r['Weight']),
        reps: num(r['Reps']),
        isWarmup: r['isWarmup'] === true || r['isWarmup'] === 1 || str(r['isWarmup']).toLowerCase() === 'true',
        rpe: null,
        duration: r['Duration'] != null ? num(r['Duration']) : null,
        distance: null,
        notes: str(r['Note']),
      })
    );

    workouts.push({
      date: str(date),
      workoutName: 'Fitbod Workout',
      exercises,
    });
  }

  return workouts;
}

// ---------- Hevy CSV Parser ----------

const KG_TO_LBS = 2.205;

export function parseHevyCSV(text: string): ParsedWorkout[] {
  const rows = parseCSV(text);
  const grouped = groupRows(
    rows,
    (r) => `${r['start_time']}||${r['title']}`
  );
  const workouts: ParsedWorkout[] = [];

  for (const [key, workoutRows] of grouped) {
    const [startTime, title] = key.split('||');
    const exercises = buildExercises(
      workoutRows,
      (r) => str(r['exercise_title']),
      (r, i) => ({
        setNumber: num(r['set_index'], i + 1),
        weight: Math.round(num(r['weight_kg']) * KG_TO_LBS * 100) / 100,
        reps: num(r['reps']),
        isWarmup: str(r['set_type']).toLowerCase() === 'warmup',
        rpe: r['rpe'] != null ? num(r['rpe']) : null,
        duration: r['duration_seconds'] != null ? num(r['duration_seconds']) : null,
        distance: r['distance_km'] != null ? num(r['distance_km']) : null,
        notes: '',
      })
    );

    workouts.push({
      date: str(startTime),
      workoutName: str(title, 'Hevy Workout'),
      exercises,
    });
  }

  return workouts;
}

// ---------- Generic CSV Parser ----------

export function parseGenericCSV(
  text: string,
  columnMapping: Record<string, string>
): ParsedWorkout[] {
  const rows = parseCSV(text);

  const col = (row: any, field: string): any => {
    const csvColumn = columnMapping[field];
    return csvColumn ? row[csvColumn] : undefined;
  };

  const dateField = columnMapping['date'] ? 'date' : undefined;
  const workoutNameField = columnMapping['workoutName'] ? 'workoutName' : undefined;

  const grouped = groupRows(rows, (r) => {
    const date = str(col(r, 'date'), 'Unknown Date');
    const name = str(col(r, 'workoutName'), 'Workout');
    return `${date}||${name}`;
  });

  const workouts: ParsedWorkout[] = [];

  for (const [key, workoutRows] of grouped) {
    const [date, workoutName] = key.split('||');
    const exercises = buildExercises(
      workoutRows,
      (r) => str(col(r, 'exerciseName'), 'Unknown Exercise'),
      (r, i) => ({
        setNumber: num(col(r, 'setNumber'), i + 1),
        weight: num(col(r, 'weight')),
        reps: num(col(r, 'reps')),
        isWarmup:
          col(r, 'isWarmup') === true ||
          col(r, 'isWarmup') === 1 ||
          str(col(r, 'isWarmup')).toLowerCase() === 'true',
        rpe: col(r, 'rpe') != null ? num(col(r, 'rpe')) : null,
        duration: col(r, 'duration') != null ? num(col(r, 'duration')) : null,
        distance: col(r, 'distance') != null ? num(col(r, 'distance')) : null,
        notes: str(col(r, 'notes')),
      })
    );

    workouts.push({
      date: str(date),
      workoutName: str(workoutName, 'Workout'),
      exercises,
    });
  }

  return workouts;
}

// ---------- JSON Parser ----------

export function parseJSON(text: string): ParsedWorkout[] {
  const data = JSON.parse(text);

  // If it's already an array of ParsedWorkout objects, validate and return
  if (Array.isArray(data)) {
    return data.map((item: any) => normalizeWorkout(item));
  }

  // If it's a single workout object, wrap in array
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return [normalizeWorkout(data)];
  }

  throw new Error('Invalid JSON format: expected an array of workouts or a single workout object');
}

function normalizeWorkout(item: any): ParsedWorkout {
  return {
    date: str(item.date, new Date().toISOString().split('T')[0]),
    workoutName: str(item.workoutName || item.workout_name || item.name, 'Workout'),
    exercises: Array.isArray(item.exercises)
      ? item.exercises.map((ex: any) => normalizeExercise(ex))
      : [],
  };
}

function normalizeExercise(ex: any): ParsedExercise {
  return {
    name: str(ex.name || ex.exercise || ex.exerciseName, 'Unknown Exercise'),
    sets: Array.isArray(ex.sets)
      ? ex.sets.map((s: any, i: number) => normalizeSet(s, i))
      : [],
  };
}

function normalizeSet(s: any, index: number): ParsedSet {
  return {
    setNumber: num(s.setNumber || s.set_number, index + 1),
    weight: num(s.weight),
    reps: num(s.reps),
    isWarmup: s.isWarmup === true || s.is_warmup === true,
    rpe: s.rpe != null ? num(s.rpe) : null,
    duration: s.duration != null ? num(s.duration) : null,
    distance: s.distance != null ? num(s.distance) : null,
    notes: str(s.notes),
  };
}
