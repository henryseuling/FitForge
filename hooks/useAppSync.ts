import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { useUserStore } from '@/stores/useUserStore';
import { useChatStore } from '@/stores/useChatStore';
import { saveHealthSnapshot } from '@/lib/api';

export function useAppSync() {
  const session = useAuthStore((s) => s.session);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!session) {
      // Reset sync flag on sign-out so the next sign-in re-syncs
      hasSynced.current = false;
      return;
    }
    if (hasSynced.current) return;
    hasSynced.current = true;

    // Load all data from Supabase in parallel
    Promise.all([
      useUserStore.getState().loadProfile(),
      useWorkoutStore.getState().loadWorkout(),
      useNutritionStore.getState().loadNutrition(),
      useProgressStore.getState().loadProgress(),
      useChatStore.getState().loadHistory(),
    ]).catch(() => {
      // Individual loaders handle their own errors
    });

    // Try to sync Apple Health data (iOS only, dev build only)
    if (Platform.OS === 'ios') {
      syncHealthData();
    }
  }, [session]);

  async function syncHealthData() {
    try {
      // Dynamic import — react-native-health only works in dev builds, not Expo Go
      const { initHealthKit, getReadinessScore } = require('@/lib/health');

      const initialized = await initHealthKit();
      if (!initialized) return;

      const readiness = await getReadinessScore();
      useWorkoutStore.getState().updateReadiness(readiness);
      saveHealthSnapshot({
        readiness_score: readiness.score,
        hrv: readiness.hrv,
        resting_hr: readiness.restingHR,
        sleep_score: readiness.sleepScore,
        recovery_score: readiness.recoveryScore,
      }).catch(() => {});
    } catch {
      // Silently fail — Apple Health not available in Expo Go
    }
  }
}
