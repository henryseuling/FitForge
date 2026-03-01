import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import { useUserStore } from '@/stores/useUserStore';
import { fetchNextSessionPlan, fetchAIObservations } from '@/lib/api';
import SetLogger from '@/components/SetLogger';

function ReadinessCard() {
  const { readinessScore, hrv, restingHR, sleepScore, recoveryScore } = useWorkoutStore();

  const metrics = [
    { label: 'HRV', value: hrv, color: colors.success },
    { label: 'Resting HR', value: restingHR, color: colors.success },
    { label: 'Sleep', value: sleepScore, color: colors.primary },
    { label: 'Recovery', value: recoveryScore, color: colors.success },
  ];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 8, padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Readiness</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={88} height={88} viewBox="0 0 88 88">
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={colors.success} />
                <Stop offset="100%" stopColor={colors.primary} />
              </LinearGradient>
            </Defs>
            <Circle cx={44} cy={44} r={36} fill="none" stroke={colors.elevated} strokeWidth={8} />
            <Circle cx={44} cy={44} r={36} fill="none" stroke="url(#grad)" strokeWidth={8} strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 - (Math.min(readinessScore, 100) / 100) * 226} rotation={-90} origin="44,44" />
          </Svg>
          <Text style={{ position: 'absolute', fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 28, color: colors.textPrimary }}>{readinessScore}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {metrics.map((m) => (
            <View key={m.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{m.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: m.value > 0 ? m.color : colors.elevated }} />
                <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 13, color: m.value > 0 ? m.color : colors.textTertiary, width: 24, textAlign: 'right' }}>{m.value || '—'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CoachPreview() {
  const [plan, setPlan] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, obs] = await Promise.all([
          fetchNextSessionPlan().catch(() => null),
          fetchAIObservations(3).catch(() => []),
        ]);
        if (!cancelled) {
          setPlan(p);
          setObservations(obs);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded || (!plan && observations.length === 0)) return null;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.12)', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path d="M6 1v10M1 6h10" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Coach's Preview</Text>
      </View>

      {plan && (
        <View style={{ gap: 8 }}>
          {plan.split_type && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 11, color: colors.primary }}>{plan.split_type}</Text>
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>Next session</Text>
            </View>
          )}
          {plan.key_lifts && Array.isArray(plan.key_lifts) && plan.key_lifts.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>Key Lifts</Text>
              {plan.key_lifts.slice(0, 3).map((lift: any, i: number) => (
                <Text key={i} style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
                  {typeof lift === 'string' ? lift : lift.name || lift.exercise || JSON.stringify(lift)}
                </Text>
              ))}
            </View>
          )}
          {plan.coach_notes && (
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>{plan.coach_notes}</Text>
          )}
        </View>
      )}

      {observations.length > 0 && (
        <View style={{ gap: 6, borderTopWidth: plan ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: plan ? 10 : 0 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>Recent Observations</Text>
          {observations.map((obs: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: obs.category === 'progress' ? colors.success : obs.category === 'calibration' ? colors.primary : colors.textTertiary, marginTop: 7 }} />
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>{obs.observation}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ExerciseRow({ exercise, isActive, index, onPress }: { exercise: any; isActive: boolean; index: number; onPress: () => void }) {
  const allDone = exercise.completedSets.length >= exercise.sets;
  return (
    <Pressable onPress={onPress} style={{
      marginHorizontal: 20, marginVertical: 4, padding: 14, paddingHorizontal: 16,
      borderRadius: 16, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: isActive ? colors.primary + '33' : 'rgba(255,255,255,0.04)',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
          backgroundColor: allDone ? colors.success : isActive ? colors.primary : colors.elevated,
          borderWidth: allDone || isActive ? 0 : 1, borderColor: 'rgba(255,255,255,0.06)',
        }}>
          {allDone ? (
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M3 7L6 10L11 4" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          ) : (
            <Text style={{ fontFamily: isActive ? 'JetBrainsMono-Bold' : 'JetBrainsMono-Medium', fontSize: isActive ? 13 : 12, color: isActive ? colors.bg : colors.textTertiary }}>{index + 1}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: allDone ? colors.textPrimary : isActive ? colors.textPrimary : colors.textSecondary }}>{exercise.name}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>
            {exercise.muscleGroup} · {exercise.completedSets.length}/{exercise.sets} sets
          </Text>
        </View>
        <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: isActive ? 14 : 13, color: isActive ? colors.textPrimary : colors.textTertiary }}>
          {exercise.sets}×{exercise.repsMin}{exercise.repsMax !== exercise.repsMin ? `-${exercise.repsMax}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function RestTimer() {
  const { restTimerSeconds, skipRestTimer, addRestTime, isRestTimerRunning, decrementRestTimer } = useWorkoutStore();
  const mins = Math.floor(restTimerSeconds / 60);
  const secs = restTimerSeconds % 60;

  useEffect(() => {
    if (!isRestTimerRunning) return;
    const interval = setInterval(() => {
      decrementRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRestTimerRunning]);

  if (!isRestTimerRunning || restTimerSeconds <= 0) return null;

  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginHorizontal: 20, marginVertical: 12, padding: 16,
      borderRadius: 16, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 32, color: colors.textPrimary }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </Text>
        <View>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Rest</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => { addRestTime(30); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textSecondary }}>+30s</Text>
        </Pressable>
        <Pressable
          onPress={() => { skipRestTimer(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }}
          style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.primary }}
        >
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.bg }}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyWorkoutState({ onStart }: { onStart: () => void }) {
  return (
    <View style={{ marginHorizontal: 20, marginTop: 16, padding: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 16 }}>
      <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={20} stroke={colors.textTertiary} strokeWidth={2} strokeDasharray="4 4" />
        <Path d="M24 16v16M16 24h16" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 17, color: colors.textPrimary }}>No workout today</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          Start a workout to begin tracking your sets and reps.
        </Text>
      </View>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStart(); }}
        style={{ paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: colors.primary }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>Start Workout</Text>
      </Pressable>
    </View>
  );
}

const WORKOUT_TEMPLATES: Record<string, string[]> = {
  '3-Day Full Body': ['Full Body A', 'Full Body B', 'Full Body C'],
  '4-Day Upper/Lower': ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
  '5-Day Rotation': ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  '6-Day PPL': ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
};

// Default exercise templates per workout type
const EXERCISE_TEMPLATES: Record<string, Array<{ name: string; muscleGroup: string; sets: number; repsMin: number; repsMax: number; weight: number }>> = {
  'Full Body A': [
    { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Bench Press', muscleGroup: 'Chest', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Barbell Row', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 95 },
    { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, repsMin: 8, repsMax: 10, weight: 65 },
    { name: 'Bicep Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
  ],
  'Full Body B': [
    { name: 'Deadlift', muscleGroup: 'Back', sets: 4, repsMin: 5, repsMax: 6, weight: 185 },
    { name: 'Incline DB Press', muscleGroup: 'Chest', sets: 3, repsMin: 8, repsMax: 10, weight: 50 },
    { name: 'Leg Press', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 180 },
    { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 100 },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 40 },
  ],
  'Full Body C': [
    { name: 'Front Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 95 },
    { name: 'Dumbbell Bench', muscleGroup: 'Chest', sets: 3, repsMin: 8, repsMax: 10, weight: 60 },
    { name: 'Cable Row', muscleGroup: 'Back', sets: 3, repsMin: 10, repsMax: 12, weight: 80 },
    { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 3, repsMin: 12, repsMax: 15, weight: 15 },
    { name: 'Leg Curl', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 70 },
  ],
  'Push': [
    { name: 'Bench Press', muscleGroup: 'Chest', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 4, repsMin: 6, repsMax: 8, weight: 65 },
    { name: 'Incline DB Press', muscleGroup: 'Chest', sets: 3, repsMin: 8, repsMax: 10, weight: 50 },
    { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 3, repsMin: 12, repsMax: 15, weight: 15 },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 40 },
    { name: 'Overhead Extension', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
  ],
  'Pull': [
    { name: 'Barbell Row', muscleGroup: 'Back', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 100 },
    { name: 'Face Pull', muscleGroup: 'Shoulders', sets: 3, repsMin: 12, repsMax: 15, weight: 30 },
    { name: 'Barbell Curl', muscleGroup: 'Arms', sets: 3, repsMin: 8, repsMax: 10, weight: 50 },
    { name: 'Hammer Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 25 },
    { name: 'Rear Delt Fly', muscleGroup: 'Shoulders', sets: 3, repsMin: 12, repsMax: 15, weight: 15 },
  ],
  'Legs': [
    { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 185 },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs', sets: 4, repsMin: 8, repsMax: 10, weight: 135 },
    { name: 'Leg Press', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 270 },
    { name: 'Leg Curl', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 70 },
    { name: 'Leg Extension', muscleGroup: 'Legs', sets: 3, repsMin: 12, repsMax: 15, weight: 60 },
    { name: 'Calf Raise', muscleGroup: 'Legs', sets: 4, repsMin: 12, repsMax: 15, weight: 90 },
  ],
  'Upper A': [
    { name: 'Bench Press', muscleGroup: 'Chest', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Barbell Row', muscleGroup: 'Back', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, repsMin: 8, repsMax: 10, weight: 65 },
    { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 100 },
    { name: 'Bicep Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 40 },
  ],
  'Upper B': [
    { name: 'Incline DB Press', muscleGroup: 'Chest', sets: 4, repsMin: 8, repsMax: 10, weight: 50 },
    { name: 'Cable Row', muscleGroup: 'Back', sets: 4, repsMin: 8, repsMax: 10, weight: 80 },
    { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', sets: 3, repsMin: 8, repsMax: 10, weight: 40 },
    { name: 'Face Pull', muscleGroup: 'Shoulders', sets: 3, repsMin: 12, repsMax: 15, weight: 30 },
    { name: 'Hammer Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 25 },
    { name: 'Overhead Extension', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
  ],
  'Lower A': [
    { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 185 },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs', sets: 3, repsMin: 8, repsMax: 10, weight: 135 },
    { name: 'Leg Press', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 270 },
    { name: 'Leg Curl', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 70 },
    { name: 'Calf Raise', muscleGroup: 'Legs', sets: 4, repsMin: 12, repsMax: 15, weight: 90 },
  ],
  'Lower B': [
    { name: 'Front Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Deadlift', muscleGroup: 'Back', sets: 4, repsMin: 5, repsMax: 6, weight: 225 },
    { name: 'Walking Lunges', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 40 },
    { name: 'Leg Extension', muscleGroup: 'Legs', sets: 3, repsMin: 12, repsMax: 15, weight: 60 },
    { name: 'Calf Raise', muscleGroup: 'Legs', sets: 4, repsMin: 12, repsMax: 15, weight: 90 },
  ],
  'Upper': [
    { name: 'Bench Press', muscleGroup: 'Chest', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Barbell Row', muscleGroup: 'Back', sets: 4, repsMin: 6, repsMax: 8, weight: 135 },
    { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, repsMin: 8, repsMax: 10, weight: 65 },
    { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 100 },
    { name: 'Bicep Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 40 },
  ],
  'Lower': [
    { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 4, repsMin: 6, repsMax: 8, weight: 185 },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs', sets: 3, repsMin: 8, repsMax: 10, weight: 135 },
    { name: 'Leg Press', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 270 },
    { name: 'Leg Curl', muscleGroup: 'Legs', sets: 3, repsMin: 10, repsMax: 12, weight: 70 },
    { name: 'Calf Raise', muscleGroup: 'Legs', sets: 4, repsMin: 12, repsMax: 15, weight: 90 },
  ],
  'Workout': [
    { name: 'Bench Press', muscleGroup: 'Chest', sets: 3, repsMin: 8, repsMax: 10, weight: 135 },
    { name: 'Barbell Row', muscleGroup: 'Back', sets: 3, repsMin: 8, repsMax: 10, weight: 95 },
    { name: 'Barbell Squat', muscleGroup: 'Legs', sets: 3, repsMin: 8, repsMax: 10, weight: 135 },
    { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, repsMin: 8, repsMax: 10, weight: 65 },
    { name: 'Bicep Curl', muscleGroup: 'Arms', sets: 3, repsMin: 10, repsMax: 12, weight: 30 },
  ],
};

export default function TrainScreen() {
  const { workoutName, dayNumber, exercises, activeExerciseIndex, setActiveExercise, startRestTimer, startWorkout } = useWorkoutStore();
  const trainingSplit = useUserStore((s) => s.trainingSplit);
  const restTimerDuration = useUserStore((s) => s.restTimerDuration);
  const [loggerExercise, setLoggerExercise] = useState<any>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasWorkout = exercises.length > 0;

  // Sync rest timer duration from user settings
  useEffect(() => {
    if (restTimerDuration) {
      useWorkoutStore.setState({ restTimerDuration });
    }
  }, [restTimerDuration]);

  const handleExercisePress = (exercise: any, index: number) => {
    setActiveExercise(index);
    if (exercise.completedSets.length < exercise.sets) {
      setLoggerExercise(exercise);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLoggerClose = (didLog?: boolean) => {
    setLoggerExercise(null);
    if (didLog) {
      startRestTimer();
    }
  };

  const handlePickWorkout = (name: string, day: number) => {
    const template = EXERCISE_TEMPLATES[name] || EXERCISE_TEMPLATES['Workout'] || [];
    const exercisesWithIds = template.map((ex, i) => ({
      ...ex,
      id: `ex-${Date.now()}-${i}`,
      completedSets: [] as any[],
      supersetGroup: null,
      restBetweenSupersets: 60,
      perSide: false,
      bodyweight: false,
      estimated1RM: null,
      previousEstimated1RM: null,
      percentChange: null,
      bestSet: null,
      exerciseNotes: '',
    }));

    useWorkoutStore.setState({
      workoutName: name,
      dayNumber: day,
      exercises: exercisesWithIds,
      activeExerciseIndex: 0,
    });
    startWorkout();
    setShowPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/active-workout');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await useWorkoutStore.getState().loadWorkout();
    setRefreshing(false);
  };

  const templates = WORKOUT_TEMPLATES[trainingSplit] || [];

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedSets = exercises.reduce((sum, e) => sum + e.completedSets.length, 0);
  const allDone = hasWorkout && completedSets >= totalSets;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Train</Text>
          <Pressable
            onPress={() => router.push('/workout-history')}
            style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textSecondary }}>History</Text>
          </Pressable>
        </View>

        <ReadinessCard />
        <CoachPreview />

        {hasWorkout ? (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 20, color: colors.textPrimary }}>{workoutName}</Text>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Day {dayNumber}</Text>
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>
                {exercises.length} exercises · {completedSets}/{totalSets} sets done
              </Text>
              {/* Progress bar */}
              <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.elevated, marginTop: 4 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: allDone ? colors.success : colors.primary, width: `${totalSets > 0 ? Math.min((completedSets / totalSets) * 100, 100) : 0}%` }} />
              </View>
            </View>

            {allDone ? (
              <View style={{ marginHorizontal: 20, marginVertical: 8, padding: 16, borderRadius: 12, backgroundColor: 'rgba(52, 211, 153, 0.08)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.15)', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.success }}>Workout Complete!</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>Great work. All sets finished.</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/active-workout'); }}
                style={{ marginHorizontal: 20, marginVertical: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>Continue Workout</Text>
              </Pressable>
            )}

            {exercises.map((exercise, i) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                isActive={i === activeExerciseIndex}
                index={i}
                onPress={() => handleExercisePress(exercise, i)}
              />
            ))}

            <RestTimer />
          </>
        ) : showPicker && templates.length > 0 ? (
          <View style={{ marginHorizontal: 20, marginTop: 16, gap: 8 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: 4 }}>Pick today's workout</Text>
            {templates.map((name, i) => (
              <Pressable
                key={i}
                onPress={() => handlePickWorkout(name, i + 1)}
                style={{
                  padding: 16, borderRadius: 12, backgroundColor: colors.surface,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary }}>{name}</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
                    Day {i + 1} · {(EXERCISE_TEMPLATES[name] || []).length} exercises
                  </Text>
                </View>
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M6 3l5 5-5 5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowPicker(false)}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textTertiary }}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <EmptyWorkoutState onStart={() => {
            if (templates.length > 0) {
              setShowPicker(true);
            } else {
              // No split configured — start a generic workout
              handlePickWorkout('Workout', 1);
            }
          }} />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {loggerExercise && (
        <SetLogger
          exercise={loggerExercise}
          visible={!!loggerExercise}
          onClose={() => handleLoggerClose(false)}
          onLog={() => handleLoggerClose(true)}
        />
      )}
    </SafeAreaView>
  );
}
