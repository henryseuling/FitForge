import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import { useUserStore } from '@/stores/useUserStore';
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
            <Circle cx={44} cy={44} r={36} fill="none" stroke="url(#grad)" strokeWidth={8} strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 - (readinessScore / 100) * 226} rotation={-90} origin="44,44" />
          </Svg>
          <Text style={{ position: 'absolute', fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 28, color: colors.textPrimary }}>{readinessScore}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {metrics.map((m) => (
            <View key={m.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{m.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: m.color }} />
                <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 13, color: m.color, width: 24, textAlign: 'right' }}>{m.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
        onPress={onStart}
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

export default function TrainScreen() {
  const { workoutName, dayNumber, exercises, activeExerciseIndex, setActiveExercise, startRestTimer, startWorkout } = useWorkoutStore();
  const trainingSplit = useUserStore((s) => s.trainingSplit);
  const [loggerExercise, setLoggerExercise] = useState<any>(null);
  const [showPicker, setShowPicker] = useState(false);

  const hasWorkout = exercises.length > 0;

  const handleExercisePress = (exercise: any, index: number) => {
    setActiveExercise(index);
    if (exercise.completedSets.length < exercise.sets) {
      setLoggerExercise(exercise);
    }
  };

  const handleLoggerClose = (didLog?: boolean) => {
    setLoggerExercise(null);
    if (didLog) {
      startRestTimer();
    }
  };

  const handlePickWorkout = (name: string, day: number) => {
    useWorkoutStore.setState({ workoutName: name, dayNumber: day });
    startWorkout();
    setShowPicker(false);
  };

  const templates = WORKOUT_TEMPLATES[trainingSplit] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Train</Text>
          <Pressable style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textSecondary }}>History</Text>
          </Pressable>
        </View>

        <ReadinessCard />

        {hasWorkout ? (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 20, color: colors.textPrimary }}>{workoutName}</Text>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Day {dayNumber}</Text>
              </View>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>
                {exercises.length} exercises · {exercises.reduce((sum, e) => sum + e.completedSets.length, 0)}/{exercises.reduce((sum, e) => sum + e.sets, 0)} sets done
              </Text>
            </View>

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
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>Day {i + 1}</Text>
                </View>
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M6 3l5 5-5 5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyWorkoutState onStart={() => {
            if (templates.length > 0) {
              setShowPicker(true);
            } else {
              // No split configured — start a generic workout
              useWorkoutStore.setState({ workoutName: 'Workout', dayNumber: 1 });
              startWorkout();
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
