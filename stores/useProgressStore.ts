import { create } from 'zustand';
import {
  fetchKeyLifts,
  fetchBodyMetrics,
  logKeyLift as apiLogKeyLift,
  logBodyMetric,
} from '@/lib/api';

export interface KeyLift {
  name: string;
  weight: number;
  delta: number;
  unit: string;
}

export interface VolumeData {
  muscle: string;
  sets: number;
  maxSets: number;
}

interface ProgressState {
  mStrengthScore: number;
  mStrengthDelta: number;
  mStrengthTier: string;
  mStrengthNextTier: number;

  keyLifts: KeyLift[];
  volumeData: VolumeData[];

  // Body metrics
  weight: number;
  sleepAvg: number;
  hrvAvg: number;
  streak: number;

  period: 'week' | 'month' | 'all';
  setPeriod: (period: 'week' | 'month' | 'all') => void;
  updateKeyLift: (lift: { name: string; weight: number }) => void;
  logBodyWeight: (weight: number) => void;
  loadProgress: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE = {
  mStrengthScore: 0,
  mStrengthDelta: 0,
  mStrengthTier: '',
  mStrengthNextTier: 0,

  keyLifts: [] as KeyLift[],
  volumeData: [] as VolumeData[],

  weight: 0,
  sleepAvg: 0,
  hrvAvg: 0,
  streak: 0,

  period: 'week' as const,
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  ...INITIAL_STATE,

  setPeriod: (period) => set({ period }),

  updateKeyLift: ({ name, weight }) => {
    set((state) => {
      const exists = state.keyLifts.some((l) => l.name === name);
      if (exists) {
        return {
          keyLifts: state.keyLifts.map((l) =>
            l.name === name ? { ...l, delta: weight - l.weight, weight } : l
          ),
        };
      }
      // Add new lift if it doesn't exist
      return {
        keyLifts: [...state.keyLifts, { name, weight, delta: 0, unit: 'lb' }],
      };
    });
    // Persist to Supabase
    apiLogKeyLift(name, weight).catch(() => {});
  },

  logBodyWeight: (weight) => {
    set({ weight });
    // Persist to Supabase
    logBodyMetric(weight).catch(() => {});
  },

  loadProgress: async () => {
    try {
      const [lifts, metrics] = await Promise.all([
        fetchKeyLifts().catch(() => []),
        fetchBodyMetrics(1).catch(() => []),
      ]);

      const updates: Record<string, any> = {};

      if (lifts && lifts.length > 0) {
        updates.keyLifts = lifts.map((l: any) => ({
          name: l.name,
          weight: l.weight,
          delta: l.delta || 0,
          unit: l.unit || 'lb',
        }));
      }

      if (metrics && metrics.length > 0) {
        updates.weight = metrics[0].weight || 0;
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch {
      // Keep defaults on error
    }
  },

  reset: () => set(INITIAL_STATE),
}));
