import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useWorkoutStore, type Exercise, type CompletedSet } from '@/stores/useWorkoutStore';

interface SetLoggerProps {
  exercise: Exercise;
  visible: boolean;
  onClose: () => void;
  onLog: () => void;
}

export default function SetLogger({ exercise, visible, onClose, onLog }: SetLoggerProps) {
  const { logSet } = useWorkoutStore();
  const nextSetNumber = exercise.completedSets.length + 1;
  const lastSet = exercise.completedSets[exercise.completedSets.length - 1];

  const [weight, setWeight] = useState(lastSet?.weight?.toString() || exercise.weight.toString());
  const [reps, setReps] = useState(lastSet?.reps?.toString() || exercise.repsMin.toString());
  const [rir, setRir] = useState('2');

  useEffect(() => {
    if (visible) {
      setWeight(lastSet?.weight?.toString() || exercise.weight.toString());
      setReps(lastSet?.reps?.toString() || exercise.repsMin.toString());
      setRir('2');
    }
  }, [visible, exercise.id]);

  const handleLog = () => {
    const set: CompletedSet = {
      setNumber: nextSetNumber,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps) || 0,
      rir: parseInt(rir) || 0,
    };

    logSet(exercise.id, set);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLog();
  };

  const adjustValue = (setter: (v: string) => void, current: string, delta: number) => {
    const val = parseFloat(current) + delta;
    if (val >= 0) {
      setter(val.toString());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 40, paddingHorizontal: 24 }}>
        {/* Handle */}
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.elevated, marginBottom: 20 }} />

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>{exercise.name}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>
              Set {nextSetNumber} of {exercise.sets}
            </Text>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 16, color: colors.bg }}>{nextSetNumber}</Text>
          </View>
        </View>

        {/* Previous sets */}
        {exercise.completedSets.length > 0 && (
          <View style={{ marginBottom: 20, gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Previous Sets</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {exercise.completedSets.map((s) => (
                <View key={s.setNumber} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.elevated }}>
                  <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: colors.textSecondary }}>
                    {s.weight}×{s.reps}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Input fields */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          {/* Weight */}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Weight (lb)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => adjustValue(setWeight, weight, -5)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textSecondary }}>-</Text>
              </Pressable>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                style={{ flex: 1, textAlign: 'center', fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingVertical: 8 }}
              />
              <Pressable onPress={() => adjustValue(setWeight, weight, 5)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textSecondary }}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Reps */}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>Reps</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => adjustValue(setReps, reps, -1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textSecondary }}>-</Text>
              </Pressable>
              <TextInput
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                style={{ flex: 1, textAlign: 'center', fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary, backgroundColor: colors.elevated, borderRadius: 10, paddingVertical: 8 }}
              />
              <Pressable onPress={() => adjustValue(setReps, reps, 1)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textSecondary }}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* RIR */}
          <View style={{ width: 80, gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>RIR</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable onPress={() => adjustValue(setRir, rir, -1)} style={{ width: 28, height: 36, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textSecondary }}>-</Text>
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated, borderRadius: 10, paddingVertical: 8 }}>
                <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary }}>{rir}</Text>
              </View>
              <Pressable onPress={() => adjustValue(setRir, rir, 1)} style={{ width: 28, height: 36, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textSecondary }}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Log button */}
        <Pressable onPress={handleLog} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.bg }}>
            Log Set {nextSetNumber}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
