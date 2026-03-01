import { create } from 'zustand';
import { fetchProfile, updateProfile as apiUpdateProfile } from '@/lib/api';

// Data-only interface — prevents accidental overwrite of actions
export interface UserData {
  name: string;
  level: string;
  height: string;
  weight: number;
  trainingSplit: string;
  restTimerMode: string;
  progressiveOverload: boolean;
  macroSplit: string;
  integrations: { name: string; connected: boolean }[];
}

interface UserState extends UserData {
  updateProfile: (updates: Partial<UserData>) => void;
  toggleProgressiveOverload: () => void;
  loadProfile: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: UserData = {
  name: '',
  level: '',
  height: '',
  weight: 0,
  trainingSplit: '',
  restTimerMode: 'Auto',
  progressiveOverload: true,
  macroSplit: '',
  integrations: [
    { name: 'Apple Health', connected: false },
    { name: 'Oura Ring', connected: false },
  ],
};

export const useUserStore = create<UserState>((set) => ({
  ...INITIAL_STATE,

  updateProfile: (updates) => {
    set((state) => ({ ...state, ...updates }));
    // Map camelCase to snake_case for DB persistence
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.height !== undefined) dbUpdates.height = updates.height;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.trainingSplit !== undefined) dbUpdates.training_split = updates.trainingSplit;
    if (updates.macroSplit !== undefined) dbUpdates.macro_split = updates.macroSplit;
    if (updates.restTimerMode !== undefined) dbUpdates.rest_timer_mode = updates.restTimerMode;
    if (updates.progressiveOverload !== undefined) dbUpdates.progressive_overload = updates.progressiveOverload;
    if (Object.keys(dbUpdates).length > 0) {
      apiUpdateProfile(dbUpdates).catch(() => {});
    }
  },

  toggleProgressiveOverload: () =>
    set((state) => {
      const next = !state.progressiveOverload;
      apiUpdateProfile({ progressive_overload: next }).catch(() => {});
      return { progressiveOverload: next };
    }),

  loadProfile: async () => {
    try {
      const profile = await fetchProfile();
      if (!profile) return;
      set({
        name: profile.name || '',
        level: profile.level || '',
        height: profile.height || '',
        weight: typeof profile.weight === 'string' ? parseFloat(profile.weight) || 0 : profile.weight || 0,
        trainingSplit: profile.split || profile.training_split || '',
        macroSplit: profile.macro_split || '',
      });
    } catch {
      // Silently fail — data stays at defaults
    }
  },

  reset: () => set(INITIAL_STATE),
}));
