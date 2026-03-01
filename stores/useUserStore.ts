import { create } from 'zustand';
import { fetchProfile, updateProfile as apiUpdateProfile } from '@/lib/api';

// Data-only interface — prevents accidental overwrite of actions
export interface UserData {
  name: string;
  level: string;
  height: string;
  weight: number;
  age: number;
  gender: string;
  trainingSplit: string;
  restTimerMode: string;
  restTimerDuration: number;
  progressiveOverload: boolean;
  macroSplit: string;
  goals: string[];
  equipment: string[];
  frequency: number;
  units: 'imperial' | 'metric';
  notifications: boolean;
  integrations: { name: string; connected: boolean }[];
}

interface UserState extends UserData {
  updateProfile: (updates: Partial<UserData>) => void;
  toggleProgressiveOverload: () => void;
  toggleUnits: () => void;
  toggleNotifications: () => void;
  setRestTimerDuration: (seconds: number) => void;
  loadProfile: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: UserData = {
  name: '',
  level: '',
  height: '',
  weight: 0,
  age: 0,
  gender: '',
  trainingSplit: '',
  restTimerMode: 'Auto',
  restTimerDuration: 90,
  progressiveOverload: true,
  macroSplit: '',
  goals: [],
  equipment: [],
  frequency: 0,
  units: 'imperial',
  notifications: true,
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
    if (updates.age !== undefined) dbUpdates.age = updates.age;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.trainingSplit !== undefined) dbUpdates.training_split = updates.trainingSplit;
    if (updates.macroSplit !== undefined) dbUpdates.macro_split = updates.macroSplit;
    if (updates.restTimerMode !== undefined) dbUpdates.rest_timer_mode = updates.restTimerMode;
    if (updates.restTimerDuration !== undefined) dbUpdates.rest_timer_duration = updates.restTimerDuration;
    if (updates.progressiveOverload !== undefined) dbUpdates.progressive_overload = updates.progressiveOverload;
    if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
    if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.units !== undefined) dbUpdates.units = updates.units;
    if (updates.notifications !== undefined) dbUpdates.notifications = updates.notifications;
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

  toggleUnits: () =>
    set((state) => {
      const next = state.units === 'imperial' ? 'metric' : 'imperial';
      apiUpdateProfile({ units: next }).catch(() => {});
      return { units: next as 'imperial' | 'metric' };
    }),

  toggleNotifications: () =>
    set((state) => {
      const next = !state.notifications;
      apiUpdateProfile({ notifications: next }).catch(() => {});
      return { notifications: next };
    }),

  setRestTimerDuration: (seconds) => {
    set({ restTimerDuration: seconds });
    apiUpdateProfile({ rest_timer_duration: seconds }).catch(() => {});
  },

  loadProfile: async () => {
    try {
      const profile = await fetchProfile();
      if (!profile) return;
      set({
        name: profile.name || '',
        level: profile.level || '',
        height: profile.height || '',
        weight: typeof profile.weight === 'string' ? parseFloat(profile.weight) || 0 : profile.weight || 0,
        age: profile.age || 0,
        gender: profile.gender || '',
        trainingSplit: profile.split || profile.training_split || '',
        macroSplit: profile.macro_split || '',
        restTimerDuration: profile.rest_timer_duration || 90,
        progressiveOverload: profile.progressive_overload ?? true,
        goals: profile.goals || [],
        equipment: profile.equipment || [],
        frequency: profile.frequency || 0,
        units: profile.units || 'imperial',
        notifications: profile.notifications ?? true,
      });
    } catch {
      // Silently fail — data stays at defaults
    }
  },

  reset: () => set(INITIAL_STATE),
}));
