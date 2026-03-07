import { create } from 'zustand';
import { fetchProfile, updateProfile as apiUpdateProfile } from '@/lib/api';
import { useProgressStore } from './useProgressStore';
import { useWorkoutStore } from './useWorkoutStore';

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
  sessionDuration: number;
  units: 'imperial' | 'metric';
  notifications: boolean;
  integrations: { name: string; connected: boolean }[];
}

interface UserState extends UserData {
  setProfile: (profile: Record<string, any>) => void;
  updateProfile: (updates: Partial<UserData>) => void;
  toggleProgressiveOverload: () => void;
  toggleUnits: () => void;
  toggleNotifications: () => void;
  setRestTimerDuration: (seconds: number) => void;
  loadProfile: () => Promise<void>;
  reset: () => void;
}

function deriveFrequencyFromTrainingSplit(trainingSplit: string): number | null {
  switch (trainingSplit) {
    case '3-Day Full Body':
      return 3;
    case '4-Day Upper/Lower':
      return 4;
    case '5-Day Rotation':
      return 5;
    case '6-Day PPL':
      return 6;
    default:
      return null;
  }
}

function mapProfileToState(profile: Record<string, any>): Partial<UserData> {
  const trainingSplit = profile.split || profile.training_split || '';
  const derivedFrequency = deriveFrequencyFromTrainingSplit(trainingSplit);
  return {
    name: profile.name || '',
    level: profile.level || '',
    height: profile.height || '',
    weight: typeof profile.weight === 'string' ? parseFloat(profile.weight) || 0 : profile.weight || 0,
    age: profile.age || 0,
    gender: profile.gender || '',
    trainingSplit,
    restTimerMode: profile.rest_timer_mode || 'Auto',
    restTimerDuration: profile.rest_timer_duration || 90,
    progressiveOverload: profile.progressive_overload ?? true,
    macroSplit: profile.macro_split || '',
    goals: profile.goals || [],
    equipment: profile.equipment || [],
    frequency: derivedFrequency ?? profile.frequency ?? 0,
    sessionDuration: profile.session_duration || 60,
    units: profile.units || 'imperial',
    notifications: profile.notifications ?? true,
    integrations: profile.integrations || INITIAL_STATE.integrations,
  };
}

function refreshDependentState(updates: Partial<UserData>) {
  if (updates.restTimerDuration !== undefined) {
    useWorkoutStore.setState({ restTimerDuration: updates.restTimerDuration });
  }

  const shouldRefreshWorkoutContext =
    updates.trainingSplit !== undefined ||
    updates.level !== undefined ||
    updates.goals !== undefined ||
    updates.equipment !== undefined ||
    updates.frequency !== undefined ||
    updates.sessionDuration !== undefined;

  const workoutState = useWorkoutStore.getState();
  if (shouldRefreshWorkoutContext && !workoutState.workoutStartedAt) {
    useWorkoutStore.getState().reset();
    void useWorkoutStore.getState().loadWorkout();
  }

  if (updates.units !== undefined || updates.weight !== undefined) {
    void useProgressStore.getState().loadProgress();
  }
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
  sessionDuration: 60,
  units: 'imperial',
  notifications: true,
  integrations: [
    { name: 'Apple Health', connected: false },
    { name: 'Oura Ring', connected: false },
  ],
};

export const useUserStore = create<UserState>((set) => ({
  ...INITIAL_STATE,

  setProfile: (profile: Record<string, any>) => {
    set(mapProfileToState(profile));
  },

  updateProfile: (updates) => {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.trainingSplit !== undefined && normalizedUpdates.frequency === undefined) {
      const derivedFrequency = deriveFrequencyFromTrainingSplit(normalizedUpdates.trainingSplit);
      if (derivedFrequency !== null) {
        normalizedUpdates.frequency = derivedFrequency;
      }
    }

    set((state) => ({ ...state, ...normalizedUpdates }));
    refreshDependentState(normalizedUpdates);
    // Map camelCase to snake_case for DB persistence
    const dbUpdates: Record<string, any> = {};
    if (normalizedUpdates.name !== undefined) dbUpdates.name = normalizedUpdates.name;
    if (normalizedUpdates.height !== undefined) dbUpdates.height = normalizedUpdates.height;
    if (normalizedUpdates.weight !== undefined) dbUpdates.weight = normalizedUpdates.weight;
    if (normalizedUpdates.age !== undefined) dbUpdates.age = normalizedUpdates.age;
    if (normalizedUpdates.gender !== undefined) dbUpdates.gender = normalizedUpdates.gender;
    if (normalizedUpdates.level !== undefined) dbUpdates.level = normalizedUpdates.level;
    if (normalizedUpdates.trainingSplit !== undefined) dbUpdates.training_split = normalizedUpdates.trainingSplit;
    if (normalizedUpdates.macroSplit !== undefined) dbUpdates.macro_split = normalizedUpdates.macroSplit;
    if (normalizedUpdates.restTimerMode !== undefined) dbUpdates.rest_timer_mode = normalizedUpdates.restTimerMode;
    if (normalizedUpdates.restTimerDuration !== undefined) dbUpdates.rest_timer_duration = normalizedUpdates.restTimerDuration;
    if (normalizedUpdates.progressiveOverload !== undefined) dbUpdates.progressive_overload = normalizedUpdates.progressiveOverload;
    if (normalizedUpdates.goals !== undefined) dbUpdates.goals = normalizedUpdates.goals;
    if (normalizedUpdates.equipment !== undefined) dbUpdates.equipment = normalizedUpdates.equipment;
    if (normalizedUpdates.frequency !== undefined) dbUpdates.frequency = normalizedUpdates.frequency;
    if (normalizedUpdates.sessionDuration !== undefined) dbUpdates.session_duration = normalizedUpdates.sessionDuration;
    if (normalizedUpdates.units !== undefined) dbUpdates.units = normalizedUpdates.units;
    if (normalizedUpdates.notifications !== undefined) dbUpdates.notifications = normalizedUpdates.notifications;
    if (normalizedUpdates.integrations !== undefined) dbUpdates.integrations = normalizedUpdates.integrations;
    if (Object.keys(dbUpdates).length > 0) {
      apiUpdateProfile(dbUpdates).catch((err) => console.warn('Failed to persist profile:', err));
    }
  },

  toggleProgressiveOverload: () =>
    set((state) => {
      const next = !state.progressiveOverload;
      apiUpdateProfile({ progressive_overload: next }).catch((err) => console.warn('Failed to persist progressive overload:', err));
      return { progressiveOverload: next };
    }),

  toggleUnits: () =>
    set((state) => {
      const next = state.units === 'imperial' ? 'metric' : 'imperial';
      refreshDependentState({ units: next as 'imperial' | 'metric' });
      apiUpdateProfile({ units: next }).catch((err) => console.warn('Failed to persist units:', err));
      return { units: next as 'imperial' | 'metric' };
    }),

  toggleNotifications: () =>
    set((state) => {
      const next = !state.notifications;
      apiUpdateProfile({ notifications: next }).catch((err) => console.warn('Failed to persist notifications:', err));
      return { notifications: next };
    }),

  setRestTimerDuration: (seconds) => {
    set({ restTimerDuration: seconds });
    refreshDependentState({ restTimerDuration: seconds });
    apiUpdateProfile({ rest_timer_duration: seconds }).catch((err) => console.warn('Failed to persist rest timer:', err));
  },

  loadProfile: async () => {
    try {
      const profile = await fetchProfile();
      if (!profile) return;
      const mapped = mapProfileToState(profile);
      set(mapped);
      refreshDependentState(mapped);
      // If profile has onboarding data, ensure auth store reflects it
      if (profile.level) {
        const { useAuthStore } = require('./useAuthStore');
        useAuthStore.getState().setOnboarded(true);
      }
    } catch {
      // Silently fail — data stays at defaults
    }
  },

  reset: () => set(INITIAL_STATE),
}));
