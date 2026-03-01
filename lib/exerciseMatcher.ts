import Fuse from 'fuse.js';
import { EXERCISES } from '@/constants/exercises';

const fuse = new Fuse(EXERCISES, {
  keys: ['name'],
  threshold: 0.4,
  includeScore: true,
});

export function matchExercise(name: string): {
  exerciseId: string;
  exerciseName: string;
  confidence: number;
} {
  const results = fuse.search(name);

  if (results.length === 0) {
    return {
      exerciseId: '',
      exerciseName: name,
      confidence: 0,
    };
  }

  const best = results[0];
  return {
    exerciseId: best.item.id,
    exerciseName: best.item.name,
    confidence: 1 - (best.score ?? 1),
  };
}

export type ExerciseMatch = {
  input: string;
  originalName: string;
  exerciseId: string;
  exerciseName: string;
  confidence: number;
  autoConfirmed: boolean;
};

export function matchAllExercises(
  names: string[]
): ExerciseMatch[] {
  const unique = [...new Set(names)];

  return unique.map((input) => {
    const match = matchExercise(input);
    return {
      input,
      originalName: input,
      exerciseId: match.exerciseId,
      exerciseName: match.exerciseName,
      confidence: match.confidence,
      autoConfirmed: match.confidence >= 0.8,
    };
  });
}
