import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useAuthStore } from '@/stores/useAuthStore';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const SPLITS = ['3-Day Full Body', '4-Day Upper/Lower', '5-Day Rotation', '6-Day PPL'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [level, setLevel] = useState('');
  const [split, setSplit] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('2500');
  const [proteinTarget, setProteinTarget] = useState('150');

  const userName = useAuthStore((s) => s.user?.user_metadata?.name || '');

  const handleFinish = () => {
    // Save to stores
    useUserStore.getState().updateProfile({
      name: userName,
      height,
      weight: parseFloat(weight) || 0,
      level,
      trainingSplit: split,
    });

    useNutritionStore.getState().updateTargets({
      calorieTarget: parseInt(calorieTarget) || 2500,
      proteinTarget: parseInt(proteinTarget) || 150,
    });

    useAuthStore.getState().setOnboarded(true);
    router.replace('/(tabs)');
  };

  const canProceed = () => {
    switch (step) {
      case 0: return height.length > 0 && weight.length > 0;
      case 1: return level.length > 0;
      case 2: return split.length > 0;
      case 3: return true;
      default: return false;
    }
  };

  function OptionPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.primary : 'rgba(255,255,255,0.06)',
        }}
      >
        <Text style={{
          fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans-Medium',
          fontSize: 15, color: selected ? colors.bg : colors.textPrimary,
        }}>{label}</Text>
      </Pressable>
    );
  }

  const steps = [
    // Step 0: Body stats
    <View key="body" style={{ gap: 20 }}>
      <View>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>
          Hey{userName ? `, ${userName}` : ''}!
        </Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary, marginTop: 6, lineHeight: 22 }}>
          Let's set up your profile so your coach can give you personalized advice.
        </Text>
      </View>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary }}>Height</Text>
          <TextInput
            value={height}
            onChangeText={setHeight}
            placeholder="5'8&quot;"
            placeholderTextColor={colors.textTertiary}
            style={{
              fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            }}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary }}>Weight (lbs)</Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="155"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            style={{
              fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            }}
          />
        </View>
      </View>
    </View>,

    // Step 1: Experience level
    <View key="level" style={{ gap: 20 }}>
      <View>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Experience level</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary, marginTop: 6, lineHeight: 22 }}>
          This helps calibrate exercise recommendations and volume.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {LEVELS.map((l) => (
          <OptionPill key={l} label={l} selected={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
    </View>,

    // Step 2: Training split
    <View key="split" style={{ gap: 20 }}>
      <View>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Training split</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary, marginTop: 6, lineHeight: 22 }}>
          Pick the split that fits your schedule. You can change this later.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {SPLITS.map((s) => (
          <OptionPill key={s} label={s} selected={split === s} onPress={() => setSplit(s)} />
        ))}
      </View>
    </View>,

    // Step 3: Nutrition targets
    <View key="nutrition" style={{ gap: 20 }}>
      <View>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Nutrition targets</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary, marginTop: 6, lineHeight: 22 }}>
          Set your daily calorie and protein goals. Your AI coach can adjust these later.
        </Text>
      </View>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary }}>Daily Calories</Text>
          <TextInput
            value={calorieTarget}
            onChangeText={setCalorieTarget}
            keyboardType="number-pad"
            style={{
              fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            }}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary }}>Daily Protein (grams)</Text>
          <TextInput
            value={proteinTarget}
            onChangeText={setProteinTarget}
            keyboardType="number-pad"
            style={{
              fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
            }}
          />
        </View>
      </View>
    </View>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 32 }}>
            {steps.map((_, i) => (
              <View key={i} style={{
                height: 4, flex: i <= step ? 1 : 0.5, borderRadius: 2,
                backgroundColor: i <= step ? colors.primary : colors.elevated,
              }} />
            ))}
          </View>

          <View style={{ flex: 1 }}>
            {steps[step]}
          </View>

          {/* Bottom buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 24 }}>
            {step > 0 && (
              <Pressable
                onPress={() => setStep(step - 1)}
                style={{
                  flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textSecondary }}>Back</Text>
              </Pressable>
            )}
            <Pressable
              onPress={isLast ? handleFinish : () => setStep(step + 1)}
              disabled={!canProceed()}
              style={{
                flex: step > 0 ? 1 : undefined, width: step === 0 ? '100%' : undefined,
                paddingVertical: 16, borderRadius: 12, alignItems: 'center',
                backgroundColor: canProceed() ? colors.primary : colors.elevated,
              }}
            >
              <Text style={{
                fontFamily: 'DMSans-Bold', fontSize: 16,
                color: canProceed() ? colors.bg : colors.textTertiary,
              }}>
                {isLast ? 'Start Training' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
