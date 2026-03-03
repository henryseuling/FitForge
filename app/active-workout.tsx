import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useWorkoutStore, type Exercise, type CompletedSet, type CardioEntry, type RecoveryEntry } from '@/stores/useWorkoutStore';
import { useUserStore } from '@/stores/useUserStore';
import { completeWorkout } from '@/lib/api';
import { getExerciseSwapSuggestions, getPostWorkoutAnalysis, completeWorkoutWithIntelligence } from '@/lib/workoutEngine';
import { getExerciseById } from '@/constants/exercises';
import { calculateEstimated1RM, getBestSet, formatBestSet, calculatePercentChange, computeSessionStats } from '@/lib/calculations';

// ─── Superset Colors ──────────────────────────────────────────
const SUPERSET_COLORS = [colors.primary, colors.success, '#8B5CF6', '#EC4899', '#F97316'];
function supersetColor(group: number): string {
  return SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length];
}

// ─── Timer Display ─────────────────────────────────────────────
function ElapsedTimer({ startedAt }: { startedAt: number | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 14, color: colors.textSecondary }}>
      {mins}:{secs.toString().padStart(2, '0')}
    </Text>
  );
}

// ─── Rest Timer Overlay ────────────────────────────────────────
function RestTimerOverlay() {
  const { restTimerSeconds, restTimerDuration, isRestTimerRunning, skipRestTimer, addRestTime, decrementRestTimer } = useWorkoutStore();

  useEffect(() => {
    if (!isRestTimerRunning) return;
    const interval = setInterval(() => decrementRestTimer(), 1000);
    return () => clearInterval(interval);
  }, [isRestTimerRunning]);

  useEffect(() => {
    if (isRestTimerRunning && restTimerSeconds <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [restTimerSeconds, isRestTimerRunning]);

  if (!isRestTimerRunning || restTimerSeconds <= 0) return null;

  const progress = restTimerDuration > 0 ? restTimerSeconds / restTimerDuration : 0;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - progress);
  const mins = Math.floor(restTimerSeconds / 60);
  const secs = restTimerSeconds % 60;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12, 12, 20, 0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>Rest</Text>
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Circle cx={80} cy={80} r={60} fill="none" stroke={colors.elevated} strokeWidth={8} />
          <Circle cx={80} cy={80} r={60} fill="none" stroke={colors.primary} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} rotation={-90} origin="80,80" />
        </Svg>
        <Text style={{ position: 'absolute', fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 40, color: colors.textPrimary }}>{mins}:{secs.toString().padStart(2, '0')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
        <Pressable onPress={() => { addRestTime(30); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textSecondary }}>+30s</Text>
        </Pressable>
        <Pressable onPress={() => { skipRestTimer(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }} style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Exercise Swap Modal ──────────────────────────────────────
function SwapExerciseModal({ visible, exercise, onClose, onSwap }: { visible: boolean; exercise: Exercise; onClose: () => void; onSwap: (s: { exerciseId: string; exerciseName: string }) => void }) {
  const { equipment } = useUserStore();
  const { exercises } = useWorkoutStore();
  const [suggestions, setSuggestions] = useState<Array<{ exerciseId: string; exerciseName: string; reason: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setSuggestions([]); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getExerciseSwapSuggestions({ exerciseToReplace: exercise.name, muscleGroup: exercise.muscleGroup, availableEquipment: equipment, currentWorkoutExercises: exercises.map((e) => e.name) })
      .then((r) => { if (!cancelled) setSuggestions(r); })
      .catch(() => { if (!cancelled) setError('Could not load suggestions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, exercise.id]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(12, 12, 20, 0.85)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>Swap Exercise</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>Replace {exercise.name}</Text>
            </View>
            <Pressable onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={12} height={12} viewBox="0 0 12 12" fill="none"><Path d="M2 2L10 10M10 2L2 10" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            {loading && <View style={{ alignItems: 'center', paddingVertical: 40 }}><ActivityIndicator color={colors.primary} size="small" /><Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary, marginTop: 12 }}>Finding alternatives...</Text></View>}
            {error && <View style={{ alignItems: 'center', paddingVertical: 32 }}><Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.danger }}>{error}</Text></View>}
            {!loading && !error && suggestions.map((s) => (
              <Pressable key={s.exerciseId} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSwap(s); }} style={{ padding: 14, borderRadius: 12, backgroundColor: colors.elevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 10 }}>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary, marginBottom: 4 }}>{s.exerciseName}</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>{s.reason}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Cardio Modal ─────────────────────────────────────────────
const CARDIO_TYPES = ['Stairmaster', 'Treadmill', 'Bike', 'Rowing', 'HIIT', 'Running', 'Other'];

function CardioModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (entry: CardioEntry) => void }) {
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => { if (!visible) { setType(''); setDuration(''); setDetails(''); } }, [visible]);

  const handleAdd = () => {
    if (!type || !duration) return;
    onAdd({ id: `cardio-${Date.now()}`, type, duration: parseInt(duration) || 0, details });
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(12, 12, 20, 0.85)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
          <View style={{ padding: 20, paddingBottom: 12 }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>Add Cardio</Text>
          </View>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CARDIO_TYPES.map((t) => (
                <Pressable key={t} onPress={() => { setType(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: type === t ? colors.primaryMuted : colors.elevated, borderWidth: 1, borderColor: type === t ? colors.primary + '44' : 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ fontFamily: type === t ? 'DMSans-SemiBold' : 'DMSans', fontSize: 13, color: type === t ? colors.primary : colors.textSecondary }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={duration} onChangeText={setDuration} placeholder="Duration (minutes)" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }} />
            <TextInput value={details} onChangeText={setDetails} placeholder="Details (optional)" placeholderTextColor={colors.textTertiary} style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }} />
            <Pressable onPress={handleAdd} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: type && duration ? colors.primary : colors.elevated, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: type && duration ? colors.bg : colors.textTertiary }}>Add Cardio</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Recovery Modal ───────────────────────────────────────────
const RECOVERY_TYPES = ['Wet Sauna', 'Dry Sauna', 'Infrared Sauna', 'Cold Plunge', 'Stretching'];

function RecoveryModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (entry: RecoveryEntry) => void }) {
  const [type, setType] = useState('');
  const [duration, setDuration] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => { if (!visible) { setType(''); setDuration(''); setDetails(''); } }, [visible]);

  const handleAdd = () => {
    if (!type || !duration) return;
    onAdd({ id: `recovery-${Date.now()}`, type, duration: parseInt(duration) || 0, details });
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(12, 12, 20, 0.85)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
          <View style={{ padding: 20, paddingBottom: 12 }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>Add Recovery</Text>
          </View>
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RECOVERY_TYPES.map((t) => (
                <Pressable key={t} onPress={() => { setType(t); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: type === t ? colors.primaryMuted : colors.elevated, borderWidth: 1, borderColor: type === t ? colors.primary + '44' : 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ fontFamily: type === t ? 'DMSans-SemiBold' : 'DMSans', fontSize: 13, color: type === t ? colors.primary : colors.textSecondary }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={duration} onChangeText={setDuration} placeholder="Duration (minutes)" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }} />
            <TextInput value={details} onChangeText={setDetails} placeholder="Details (optional)" placeholderTextColor={colors.textTertiary} style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }} />
            <Pressable onPress={handleAdd} style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: type && duration ? colors.primary : colors.elevated, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: type && duration ? colors.bg : colors.textTertiary }}>Add Recovery</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Set Row ───────────────────────────────────────────────────
function SetRow({ setNum, targetReps, exercise, completed, onComplete }: {
  setNum: number;
  targetReps: string;
  exercise: Exercise;
  completed: CompletedSet | null;
  onComplete: (weight: number, reps: number, rir: number | null, isWarmup: boolean) => void;
}) {
  const lastSet = exercise.completedSets[exercise.completedSets.length - 1];
  const [weight, setWeight] = useState(completed?.weight?.toString() || lastSet?.weight?.toString() || exercise.weight.toString());
  const [reps, setReps] = useState(completed?.reps?.toString() || exercise.repsMin.toString());
  const [rir, setRir] = useState<string>('');
  const [isWarmup, setIsWarmup] = useState(false);

  // Compute if this is the best set (highest e1RM among working sets)
  const isBestSet = completed && !completed.isWarmup && (() => {
    const workingSets = exercise.completedSets.filter((s) => !s.isWarmup);
    if (workingSets.length === 0) return false;
    const best = getBestSet(workingSets);
    return best?.setNumber === completed.setNumber;
  })();

  if (completed) {
    const e1rm = !completed.isWarmup ? calculateEstimated1RM(completed.weight, completed.reps) : 0;
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 10, backgroundColor: completed.isWarmup ? 'rgba(255,255,255,0.03)' : 'rgba(52, 211, 153, 0.06)', marginBottom: 6,
        opacity: completed.isWarmup ? 0.6 : 1,
      }}>
        {/* Warmup indicator */}
        {completed.isWarmup && (
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.warning, width: 32 }}>W</Text>
        )}
        {!completed.isWarmup && (
          <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 13, color: colors.success, width: 32 }}>{setNum}</Text>
        )}
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, flex: 1 }}>{targetReps}</Text>
        <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 14, color: colors.textPrimary, width: 60, textAlign: 'center' }}>{completed.weight}</Text>
        <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 14, color: colors.textPrimary, width: 40, textAlign: 'center' }}>{completed.reps}</Text>
        {completed.rir != null && (
          <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: colors.textTertiary, width: 30, textAlign: 'center' }}>R{completed.rir}</Text>
        )}
        {isBestSet && (
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.primaryMuted, marginLeft: 4 }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 9, color: colors.primary }}>BEST</Text>
          </View>
        )}
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: completed.isWarmup ? colors.elevated : colors.success, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M3 7L6 10L11 4" stroke={completed.isWarmup ? colors.textTertiary : colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
      {/* Warmup toggle */}
      <Pressable onPress={() => { setIsWarmup(!isWarmup); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 32, alignItems: 'center' }}>
        <Text style={{ fontFamily: isWarmup ? 'DMSans-Bold' : 'JetBrainsMono-SemiBold', fontSize: 13, color: isWarmup ? colors.warning : colors.textTertiary }}>{isWarmup ? 'W' : setNum}</Text>
      </Pressable>
      <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, flex: 1 }}>{targetReps}</Text>
      <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 14, color: colors.textPrimary, width: 60, textAlign: 'center', backgroundColor: colors.elevated, borderRadius: 8, paddingVertical: 6 }} />
      <View style={{ width: 6 }} />
      <TextInput value={reps} onChangeText={setReps} keyboardType="number-pad" style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 14, color: colors.textPrimary, width: 40, textAlign: 'center', backgroundColor: colors.elevated, borderRadius: 8, paddingVertical: 6 }} />
      <View style={{ width: 6 }} />
      <TextInput value={rir} onChangeText={setRir} placeholder="RIR" placeholderTextColor={colors.textTertiary + '66'} keyboardType="number-pad" style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: colors.textSecondary, width: 34, textAlign: 'center', backgroundColor: colors.elevated, borderRadius: 8, paddingVertical: 6 }} />
      <View style={{ width: 6 }} />
      <Pressable onPress={() => onComplete(parseFloat(weight) || 0, parseInt(reps) || 0, rir ? parseInt(rir) : null, isWarmup)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
        <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M3 7L6 10L11 4" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>
    </View>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────
function ExerciseCard({ exercise, isActive, onSetComplete, supersetLabel }: {
  exercise: Exercise;
  isActive: boolean;
  onSetComplete: () => void;
  supersetLabel?: string;
}) {
  const { logSet, startRestTimer } = useWorkoutStore();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const allDone = exercise.completedSets.length >= exercise.sets;
  const exerciseDetails = getExerciseById(exercise.id);

  // Compute live 1RM from working sets
  const workingSets = exercise.completedSets.filter((s) => !s.isWarmup);
  const bestSetObj = getBestSet(exercise.completedSets);
  const liveE1RM = bestSetObj ? calculateEstimated1RM(bestSetObj.weight, bestSetObj.reps) : exercise.estimated1RM;
  const pctChange = liveE1RM && exercise.previousEstimated1RM ? calculatePercentChange(liveE1RM, exercise.previousEstimated1RM) : exercise.percentChange;
  const bestSetStr = formatBestSet(bestSetObj) || exercise.bestSet;

  const handleCompleteSet = (weight: number, reps: number, rir: number | null, isWarmup: boolean) => {
    const setNumber = exercise.completedSets.length + 1;
    logSet(exercise.id, { setNumber, weight, reps, rir, isWarmup, perSide: exercise.perSide, bodyweight: exercise.bodyweight, note: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startRestTimer();
    onSetComplete();
  };

  const handleSwap = (suggestion: { exerciseId: string; exerciseName: string }) => {
    const swapDetails = getExerciseById(suggestion.exerciseId);
    useWorkoutStore.setState((state) => ({
      exercises: state.exercises.map((ex) => ex.id === exercise.id ? { ...ex, id: suggestion.exerciseId, name: suggestion.exerciseName, muscleGroup: swapDetails?.primaryMuscle || ex.muscleGroup, completedSets: [] } : ex),
    }));
    setShowSwapModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddSet = () => {
    useWorkoutStore.setState((state) => ({ exercises: state.exercises.map((ex) => ex.id === exercise.id ? { ...ex, sets: ex.sets + 1 } : ex) }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const targetReps = exercise.repsMin === exercise.repsMax ? `${exercise.repsMin}` : `${exercise.repsMin}-${exercise.repsMax}`;
  const ssColor = exercise.supersetGroup ? supersetColor(exercise.supersetGroup) : null;

  return (
    <View style={{
      marginHorizontal: 20, marginBottom: 12, borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: isActive ? colors.primary + '33' : allDone ? colors.success + '22' : 'rgba(255,255,255,0.04)',
      overflow: 'hidden',
      borderLeftWidth: ssColor ? 3 : 1, borderLeftColor: ssColor || (isActive ? colors.primary + '33' : 'rgba(255,255,255,0.04)'),
    }}>
      {/* Exercise Header */}
      <View style={{ padding: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {supersetLabel && ssColor && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: ssColor + '22' }}>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 10, color: ssColor }}>{supersetLabel}</Text>
            </View>
          )}
          <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: allDone ? colors.success : isActive ? colors.primary : colors.elevated }}>
            {allDone ? (
              <Svg width={12} height={12} viewBox="0 0 14 14" fill="none"><Path d="M3 7L6 10L11 4" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            ) : (
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 11, color: isActive ? colors.bg : colors.textTertiary }}>{exercise.completedSets.length}/{exercise.sets}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary }}>{exercise.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{exercise.muscleGroup} · {exercise.sets} x {targetReps}</Text>
              {exercise.perSide && <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.textTertiary }}>per side</Text>}
              {exercise.bodyweight && <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.textTertiary }}>BW</Text>}
            </View>
          </View>

          {exerciseDetails && (
            <Pressable onPress={() => { setShowInstructions((p) => !p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: showInstructions ? colors.primaryMuted : colors.elevated }}>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: showInstructions ? colors.primary : colors.textTertiary }}>?</Text>
            </Pressable>
          )}
          <Pressable onPress={() => { setShowSwapModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated }}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M7 16L3 12M3 12L7 8M3 12H16M17 8L21 12M21 12L17 16M21 12H8" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>

        {/* 1RM / Best Set / Percent Change */}
        {workingSets.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {liveE1RM ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary }}>Est 1RM</Text>
                <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 13, color: colors.textPrimary }}>{liveE1RM}</Text>
              </View>
            ) : null}
            {pctChange != null && pctChange !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                  <Path d={pctChange > 0 ? "M5 8V2M5 2L2 5M5 2l3 3" : "M5 2V8M5 8L2 5M5 8l3-3"} stroke={pctChange > 0 ? colors.success : colors.danger} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 11, color: pctChange > 0 ? colors.success : colors.danger }}>{pctChange > 0 ? '+' : ''}{pctChange}%</Text>
              </View>
            )}
            {bestSetStr && (
              <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: colors.textTertiary }}>Best: {bestSetStr}</Text>
            )}
          </View>
        )}
      </View>

      {showInstructions && exerciseDetails && (
        <View style={{ marginHorizontal: 14, marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: colors.elevated }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Instructions</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{exerciseDetails.instructions}</Text>
          {exerciseDetails.tips ? (<><Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Tips</Text><Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{exerciseDetails.tips}</Text></>) : null}
        </View>
      )}

      {/* Sets Table */}
      {isActive && !allDone && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 4 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, width: 32 }}>Set</Text>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>Target</Text>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, width: 60, textAlign: 'center' }}>Wt</Text>
            <View style={{ width: 6 }} />
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, width: 40, textAlign: 'center' }}>Reps</Text>
            <View style={{ width: 6 }} />
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, width: 34, textAlign: 'center' }}>RIR</Text>
            <View style={{ width: 38 }} />
          </View>

          {Array.from({ length: exercise.sets }).map((_, i) => (
            <SetRow key={i} setNum={i + 1} targetReps={targetReps} exercise={exercise} completed={exercise.completedSets[i] || null} onComplete={(w, r, rir, warmup) => handleCompleteSet(w, r, rir, warmup)} />
          ))}

          <Pressable onPress={handleAddSet} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.elevated, marginTop: 4 }}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M7 2V12M2 7H12" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textTertiary }}>Add Set</Text>
          </Pressable>
        </View>
      )}

      <SwapExerciseModal visible={showSwapModal} exercise={exercise} onClose={() => setShowSwapModal(false)} onSwap={handleSwap} />
    </View>
  );
}

// ─── Workout Completion Screen ─────────────────────────────────
function CompletionScreen({ onDone }: { onDone: () => void }) {
  const { workoutName, exercises, workoutStartedAt, workoutId, splitType, sessionNotes, cardioEntries, recoveryEntries, setSessionNotes } = useWorkoutStore();
  const { goals, level, equipment, age, gender, height, weight, frequency } = useUserStore();
  const duration = workoutStartedAt ? Math.floor((Date.now() - workoutStartedAt) / 60000) : 0;

  const stats = computeSessionStats(exercises);
  const totalVolume = stats.totalVolume;
  const muscleGroups = stats.musclesTrained;

  const [rating, setRating] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ summary: string; personalRecords: string[]; recoveryTips: string; motivation: string } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [notes, setNotes] = useState(sessionNotes);

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAnalysis(true);
    setAnalysisLoading(true);
    setAnalysisError(false);
    setSessionNotes(notes);

    try {
      if (workoutId) {
        const result = await completeWorkoutWithIntelligence({
          workoutId,
          exercises: exercises.map((ex) => ({
            exerciseId: ex.id,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: ex.completedSets.map((s) => ({ weight: s.weight, reps: s.reps, isWarmup: s.isWarmup, rir: s.rir })),
            estimated1RM: ex.estimated1RM,
            previousEstimated1RM: ex.previousEstimated1RM,
          })),
          sessionStats: stats,
          durationMinutes: duration,
          splitType,
          sessionNotes: notes,
          cardioData: cardioEntries.length > 0 ? cardioEntries : null,
          saunaData: recoveryEntries.length > 0 ? recoveryEntries : null,
          userGoals: goals,
        });

        // Also get classic post-workout analysis for the UI
        const classicAnalysis = await getPostWorkoutAnalysis({
          workoutName,
          exercises: exercises.map((ex) => ({ name: ex.name, sets: ex.completedSets.filter((s) => !s.isWarmup).map((s) => ({ weight: s.weight, reps: s.reps })), targetSets: ex.sets, targetReps: ex.repsMin === ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}-${ex.repsMax}` })),
          duration,
          totalVolume,
          userContext: { userProfile: { goals, experience: level, equipment, age, gender, height, weight, workoutFrequency: frequency } },
        });
        setAnalysis(classicAnalysis);
      }
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Svg width={32} height={32} viewBox="0 0 32 32" fill="none"><Path d="M8 16L14 22L24 10" stroke={colors.bg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </View>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.textPrimary, marginBottom: 4 }}>Workout Complete!</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary }}>{workoutName}</Text>
        {splitType ? <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.primary, marginTop: 4 }}>{splitType}</Text> : null}
      </View>

      {/* Stats Grid */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <View style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 24, color: colors.primary }}>{duration}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>minutes</Text>
        </View>
        <View style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 24, color: colors.success }}>{stats.totalWorkingSets}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>working sets</Text>
        </View>
        <View style={{ flex: 1, padding: 16, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 24, color: colors.textPrimary }}>{totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>volume (lb)</Text>
        </View>
      </View>

      {/* Volume by muscle */}
      {Object.keys(stats.volumeByMuscle).length > 0 && (
        <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 10 }}>Volume by Muscle</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(stats.volumeByMuscle).map(([muscle, sets]) => (
              <View key={muscle} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.primaryMuted }}>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.primary }}>{muscle}: {sets} sets</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cardio & Recovery entries */}
      {(cardioEntries.length > 0 || recoveryEntries.length > 0) && (
        <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 20 }}>
          {cardioEntries.length > 0 && (
            <View style={{ marginBottom: recoveryEntries.length > 0 ? 12 : 0 }}>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Cardio</Text>
              {cardioEntries.map((c) => (
                <Text key={c.id} style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textPrimary, marginBottom: 2 }}>{c.type} · {c.duration}min{c.details ? ` · ${c.details}` : ''}</Text>
              ))}
            </View>
          )}
          {recoveryEntries.length > 0 && (
            <View>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Recovery</Text>
              {recoveryEntries.map((r) => (
                <Text key={r.id} style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textPrimary, marginBottom: 2 }}>{r.type} · {r.duration}min{r.details ? ` · ${r.details}` : ''}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Session Notes */}
      <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 20 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 8 }}>Session Notes</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="How did the session feel? Any notes..." placeholderTextColor={colors.textTertiary} multiline style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top' }} />
      </View>

      {/* Difficulty Rating */}
      <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 24 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 12 }}>How did it feel?</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['Easy', 'Just Right', 'Hard'].map((r) => (
            <Pressable key={r} onPress={() => { setRating(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: rating === r ? colors.primaryMuted : colors.elevated, borderWidth: 1, borderColor: rating === r ? colors.primary + '33' : 'transparent' }}>
              <Text style={{ fontFamily: rating === r ? 'DMSans-SemiBold' : 'DMSans', fontSize: 14, color: rating === r ? colors.primary : colors.textSecondary }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* AI Analysis */}
      {showAnalysis && (
        <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary + '22', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"><Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
            </View>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary }}>AI Analysis</Text>
          </View>
          {analysisLoading && <View style={{ alignItems: 'center', paddingVertical: 24 }}><ActivityIndicator color={colors.primary} size="small" /><Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, marginTop: 10 }}>Analyzing your workout...</Text></View>}
          {analysisError && <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center', paddingVertical: 12 }}>Could not generate analysis. You can still finish your workout.</Text>}
          {analysis && (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Summary</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary, lineHeight: 20 }}>{analysis.summary}</Text>
              </View>
              {analysis.personalRecords.length > 0 && (
                <View>
                  <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Highlights</Text>
                  {analysis.personalRecords.map((pr, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.success }}>*</Text>
                      <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, flex: 1 }}>{pr}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Recovery</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{analysis.recoveryTips}</Text>
              </View>
              <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary + '22' }}>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.primary, lineHeight: 19, textAlign: 'center' }}>{analysis.motivation}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {showAnalysis ? (
        <Pressable onPress={onDone} disabled={analysisLoading} style={{ backgroundColor: analysisLoading ? colors.elevated : colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: analysisLoading ? 0.6 : 1 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: analysisLoading ? colors.textTertiary : colors.bg }}>{analysisLoading ? 'Analyzing...' : 'Finish'}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={handleFinish} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.bg }}>Done</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ───────────────────────────────────────────────
export default function ActiveWorkoutScreen() {
  const { workoutName, exercises, activeExerciseIndex, setActiveExercise, workoutStartedAt, workoutId, addCardioEntry, addRecoveryEntry, cardioEntries, recoveryEntries, removeCardioEntry, removeRecoveryEntry } = useWorkoutStore();
  const scrollRef = useRef<ScrollView>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedSets = exercises.reduce((sum, e) => sum + e.completedSets.length, 0);
  const allDone = totalSets > 0 && completedSets >= totalSets;

  // Build superset labels
  const supersetLabels: Record<string, string> = {};
  const groupCounts: Record<number, number> = {};
  for (const ex of exercises) {
    if (ex.supersetGroup != null) {
      groupCounts[ex.supersetGroup] = (groupCounts[ex.supersetGroup] || 0) + 1;
      const letter = String.fromCharCode(64 + ex.supersetGroup); // A, B, C...
      supersetLabels[ex.id] = `${letter}${groupCounts[ex.supersetGroup]}`;
    }
  }

  const handleSetComplete = useCallback(() => {
    const currentEx = exercises[activeExerciseIndex];
    if (currentEx && currentEx.completedSets.length >= currentEx.sets) {
      // If in a superset, advance to next in group first
      if (currentEx.supersetGroup != null) {
        const nextInGroup = exercises.findIndex((e, i) => i > activeExerciseIndex && e.supersetGroup === currentEx.supersetGroup && e.completedSets.length < e.sets);
        if (nextInGroup >= 0) { setActiveExercise(nextInGroup); return; }
      }
      const nextIndex = exercises.findIndex((e, i) => i > activeExerciseIndex && e.completedSets.length < e.sets);
      if (nextIndex >= 0) setActiveExercise(nextIndex);
    }
  }, [exercises, activeExerciseIndex]);

  const handleFinishWorkout = async () => {
    if (completedSets === 0) { Alert.alert('No sets logged', 'Complete at least one set before finishing.'); return; }
    if (workoutId && workoutStartedAt) {
      const durationMinutes = Math.floor((Date.now() - workoutStartedAt) / 60000);
      try {
        await completeWorkout(workoutId, durationMinutes, {
          cardioData: cardioEntries.length > 0 ? cardioEntries : undefined,
          saunaData: recoveryEntries.length > 0 ? recoveryEntries : undefined,
        });
      } catch (err) {
        console.warn('Failed to save workout completion:', err);
      }
    }
    setIsCompleted(true);
  };

  const handleDone = () => { useWorkoutStore.getState().reset(); router.back(); };

  const handleCancel = () => {
    Alert.alert('Cancel Workout', 'Are you sure? Your logged sets will still be saved.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Cancel Workout', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (isCompleted) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}><CompletionScreen onDone={handleDone} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <RestTimerOverlay />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={handleCancel} accessibilityRole="button" accessibilityLabel="Cancel workout">
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textSecondary }}>Cancel</Text>
        </Pressable>
        <View accessible accessibilityRole="header" style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textPrimary }}>{workoutName}</Text>
          <ElapsedTimer startedAt={workoutStartedAt} />
        </View>
        <Pressable onPress={handleFinishWorkout} accessibilityRole="button" accessibilityLabel="Finish workout" style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: allDone ? colors.success : colors.primary }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.bg }}>Finish</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: colors.elevated, marginHorizontal: 20, borderRadius: 2 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: allDone ? colors.success : colors.primary, width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} />
      </View>

      {/* Exercise dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: 12 }}>
        {exercises.map((ex, i) => {
          const done = ex.completedSets.length >= ex.sets;
          const active = i === activeExerciseIndex;
          const ssColor = ex.supersetGroup ? supersetColor(ex.supersetGroup) : null;
          return (
            <Pressable key={ex.id} onPress={() => setActiveExercise(i)}>
              <View style={{ width: active ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: done ? colors.success : active ? (ssColor || colors.primary) : colors.elevated }} />
            </Pressable>
          );
        })}
      </View>

      {/* Exercises List */}
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {exercises.map((exercise, index) => (
          <Pressable key={exercise.id} onPress={() => setActiveExercise(index)}>
            <ExerciseCard exercise={exercise} isActive={index === activeExerciseIndex} onSetComplete={handleSetComplete} supersetLabel={supersetLabels[exercise.id]} />
          </Pressable>
        ))}

        {/* Cardio entries */}
        {cardioEntries.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            {cardioEntries.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, flex: 1 }}>{c.type} · {c.duration}min</Text>
                <Pressable onPress={() => removeCardioEntry(c.id)}><Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.danger }}>Remove</Text></Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Recovery entries */}
        {recoveryEntries.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            {recoveryEntries.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, flex: 1 }}>{r.type} · {r.duration}min</Text>
                <Pressable onPress={() => removeRecoveryEntry(r.id)}><Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.danger }}>Remove</Text></Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add Cardio / Recovery buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 12 }}>
          <Pressable onPress={() => { setShowCardioModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M7 2V12M2 7H12" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textSecondary }}>Cardio</Text>
          </Pressable>
          <Pressable onPress={() => { setShowRecoveryModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M7 2V12M2 7H12" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textSecondary }}>Recovery</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CardioModal visible={showCardioModal} onClose={() => setShowCardioModal(false)} onAdd={addCardioEntry} />
      <RecoveryModal visible={showRecoveryModal} onClose={() => setShowRecoveryModal(false)} onAdd={addRecoveryEntry} />
    </SafeAreaView>
  );
}
