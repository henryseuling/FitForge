import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import * as Haptics from 'expo-haptics';

const TOTAL_STEPS = 6;

const GOALS = ['Lose Weight', 'Build Muscle', 'Improve Endurance', 'General Fitness'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LEVEL_DESCRIPTIONS: Record<string, string> = {
  Beginner: 'New to lifting or returning after a long break',
  Intermediate: '1-3 years of consistent training',
  Advanced: '3+ years with solid strength base',
};
const EQUIPMENT_OPTIONS = [
  'Bodyweight Only',
  'Dumbbells',
  'Barbell & Rack',
  'Cables & Machines',
  'Full Gym',
  'Resistance Bands',
];
const FREQUENCY_OPTIONS = [2, 3, 4, 5, 6];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

function getSuggestedSplit(days: number): string {
  switch (days) {
    case 2:
      return '2-Day Full Body';
    case 3:
      return '3-Day Full Body';
    case 4:
      return '4-Day Upper/Lower';
    case 5:
      return '5-Day Upper/Lower/Push/Pull/Legs';
    case 6:
      return '6-Day PPL';
    default:
      return '3-Day Full Body';
  }
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  // Step 0 - Goals
  const [goals, setGoals] = useState<string[]>([]);

  // Step 1 - Level
  const [level, setLevel] = useState('');

  // Step 2 - Body Stats
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  // Step 3 - Equipment
  const [equipment, setEquipment] = useState<string[]>([]);

  // Step 4 - Frequency
  const [frequency, setFrequency] = useState(0);

  // Step 5 - Nutrition (auto-calculated via Mifflin-St Jeor)
  const [calorieTarget, setCalorieTarget] = useState('2500');
  const [proteinTarget, setProteinTarget] = useState('150');
  const [autoCalculated, setAutoCalculated] = useState(false);

  const userName = useAuthStore((s) => s.user?.user_metadata?.name || '');
  const suggestedSplit = getSuggestedSplit(frequency);

  const toggleGoal = useCallback((goal: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }, []);

  const toggleEquipment = useCallback((item: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return goals.length > 0;
      case 1:
        return level.length > 0;
      case 2:
        return height.length > 0 && weight.length > 0 && age.length > 0 && gender.length > 0;
      case 3:
        return equipment.length > 0;
      case 4:
        return frequency > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < TOTAL_STEPS - 1) {
      const nextStep = step + 1;
      // Auto-calculate nutrition targets when entering the nutrition step
      if (nextStep === 5 && !autoCalculated && weight && age && gender) {
        const w = parseFloat(weight) || 155;
        const a = parseInt(age) || 25;
        // Parse height — supports "5'10" or "70" (inches) or "178" (cm if metric)
        let heightCm = 175;
        const ftMatch = height.match(/(\d+)'(\d+)/);
        if (ftMatch) {
          heightCm = (parseInt(ftMatch[1]) * 12 + parseInt(ftMatch[2])) * 2.54;
        } else {
          const numHeight = parseFloat(height);
          if (numHeight > 100) heightCm = numHeight; // assume cm
          else if (numHeight > 0) heightCm = numHeight * 2.54; // assume inches
        }
        const weightKg = w * 0.4536;
        // Mifflin-St Jeor equation
        let bmr: number;
        if (gender === 'Male') {
          bmr = 10 * weightKg + 6.25 * heightCm - 5 * a + 5;
        } else if (gender === 'Female') {
          bmr = 10 * weightKg + 6.25 * heightCm - 5 * a - 161;
        } else {
          bmr = 10 * weightKg + 6.25 * heightCm - 5 * a - 78; // midpoint
        }
        // Activity multiplier based on frequency
        const activityMultipliers: Record<number, number> = { 2: 1.375, 3: 1.55, 4: 1.55, 5: 1.725, 6: 1.9 };
        const multiplier = activityMultipliers[frequency] || 1.55;
        let tdee = Math.round(bmr * multiplier);
        // Adjust based on goals
        if (goals.includes('Lose Weight')) tdee = Math.round(tdee * 0.8); // 20% deficit
        else if (goals.includes('Build Muscle')) tdee = Math.round(tdee * 1.1); // 10% surplus
        // Protein: 0.8-1g per lb bodyweight for muscle building, 0.7g for general
        let protein = Math.round(w * 0.8);
        if (goals.includes('Build Muscle')) protein = Math.round(w * 1.0);
        else if (goals.includes('Lose Weight')) protein = Math.round(w * 0.9);
        setCalorieTarget(tdee.toString());
        setProteinTarget(protein.toString());
        setAutoCalculated(true);
      }
      setStep(nextStep);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step - 1);
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    useUserStore.getState().updateProfile({
      name: userName,
      height,
      weight: parseFloat(weight) || 0,
      level,
      trainingSplit: suggestedSplit,
      goals,
      equipment,
      age: parseInt(age) || 0,
      gender,
      frequency,
    } as any);

    // Calculate macro split from calories and protein
    const cals = parseInt(calorieTarget) || 2500;
    const protein = parseInt(proteinTarget) || 150;
    const proteinCals = protein * 4;
    const remainingCals = cals - proteinCals;
    // 45% carbs, 55% fat from remaining calories
    const carbsTarget = Math.round((remainingCals * 0.55) / 4);
    const fatTarget = Math.round((remainingCals * 0.45) / 9);

    useNutritionStore.getState().updateTargets({
      calorieTarget: cals,
      proteinTarget: protein,
      carbsTarget,
      fatTarget,
    });

    // Mark onboarding as completed in Supabase
    try {
      const { updateProfile: apiUpdateProfile } = require('@/lib/api');
      await apiUpdateProfile({ onboarding_completed: true });
    } catch {}

    useAuthStore.getState().setOnboarded(true);
    router.replace('/(tabs)');
  };

  const isLast = step === TOTAL_STEPS - 1;

  // ─── Subcomponents ───────────────────────────────────────────

  function ProgressBar() {
    return (
      <View style={{ flexDirection: 'row', gap: 6, paddingTop: 16, paddingBottom: 32 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{
              height: 4,
              flex: i <= step ? 1 : 0.6,
              borderRadius: 2,
              backgroundColor: i <= step ? colors.primary : colors.elevated,
            }}
          />
        ))}
      </View>
    );
  }

  function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontFamily: 'DMSans-Bold',
            fontSize: 28,
            color: colors.textPrimary,
            letterSpacing: -0.8,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans',
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: 8,
            lineHeight: 22,
          }}
        >
          {subtitle}
        </Text>
      </View>
    );
  }

  function MultiSelectPill({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 100,
          backgroundColor: selected ? colors.primaryMuted : colors.surface,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.borderLight,
        }}
      >
        <Text
          style={{
            fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans-Medium',
            fontSize: 15,
            color: selected ? colors.primary : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function InputField({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  }) {
    return (
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: 'DMSans-Medium',
            fontSize: 13,
            color: colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType || 'default'}
          style={{
            fontFamily: 'DMSans',
            fontSize: 16,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.borderLight,
          }}
        />
      </View>
    );
  }

  // ─── Step Renderers ──────────────────────────────────────────

  function renderGoals() {
    return (
      <View>
        <StepHeader
          title={`What are your goals${userName ? `, ${userName}` : ''}?`}
          subtitle="Select all that apply. This helps your AI coach personalize your training plan."
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {GOALS.map((goal) => (
            <MultiSelectPill
              key={goal}
              label={goal}
              selected={goals.includes(goal)}
              onPress={() => toggleGoal(goal)}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderLevel() {
    return (
      <View>
        <StepHeader
          title="Experience level"
          subtitle="This helps calibrate exercise recommendations and training volume."
        />
        <View style={{ gap: 10 }}>
          {LEVELS.map((l) => {
            const selected = level === l;
            return (
              <Pressable
                key={l}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLevel(l);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  borderRadius: 14,
                  backgroundColor: selected ? colors.primaryMuted : colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.borderLight,
                  gap: 14,
                }}
              >
                {/* Radio dot */}
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.textTertiary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans-Medium',
                      fontSize: 16,
                      color: selected ? colors.primary : colors.textPrimary,
                    }}
                  >
                    {l}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans',
                      fontSize: 13,
                      color: colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    {LEVEL_DESCRIPTIONS[l]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function renderBodyStats() {
    return (
      <View>
        <StepHeader
          title="Body stats"
          subtitle="Used to calibrate calorie estimates and track your progress over time."
        />
        <View style={{ gap: 16 }}>
          <InputField
            label="Height"
            value={height}
            onChangeText={setHeight}
            placeholder={'5\'10"'}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Weight (lbs)"
                value={weight}
                onChangeText={setWeight}
                placeholder="155"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="28"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 13,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Gender
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {GENDERS.map((g) => {
                const selected = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGender(g);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 100,
                      alignItems: 'center',
                      backgroundColor: selected ? colors.primaryMuted : colors.surface,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans-Medium',
                        fontSize: 15,
                        color: selected ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {g}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  }

  function renderEquipment() {
    return (
      <View>
        <StepHeader
          title="What equipment do you have?"
          subtitle="Select everything you have access to. We'll build workouts around your setup."
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {EQUIPMENT_OPTIONS.map((item) => (
            <MultiSelectPill
              key={item}
              label={item}
              selected={equipment.includes(item)}
              onPress={() => toggleEquipment(item)}
            />
          ))}
        </View>
      </View>
    );
  }

  function renderFrequency() {
    return (
      <View>
        <StepHeader
          title="How many days per week?"
          subtitle="We'll suggest a training split based on your availability."
        />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {FREQUENCY_OPTIONS.map((n) => {
            const selected = frequency === n;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFrequency(n);
                }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  maxWidth: 64,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.primaryMuted : colors.surface,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.borderLight,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono-Bold',
                    fontSize: 22,
                    color: selected ? colors.primary : colors.textSecondary,
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Suggested split */}
        {frequency > 0 && (
          <View
            style={{
              backgroundColor: colors.primaryMuted,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(232, 168, 56, 0.2)',
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 13,
                color: colors.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 4,
              }}
            >
              Suggested Split
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 17,
                color: colors.textPrimary,
              }}
            >
              {suggestedSplit}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              Optimized for {frequency} training days. You can change this anytime in settings.
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderNutrition() {
    return (
      <View>
        <StepHeader
          title="Nutrition targets"
          subtitle={autoCalculated
            ? "Calculated using the Mifflin-St Jeor equation based on your stats. Feel free to adjust."
            : "Set your daily calorie and protein goals. Your AI coach can adjust these later based on your progress."
          }
        />
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 13,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Daily Calories
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderLight,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={calorieTarget}
                onChangeText={setCalorieTarget}
                keyboardType="number-pad"
                style={{
                  fontFamily: 'JetBrainsMono-Bold',
                  fontSize: 22,
                  color: colors.textPrimary,
                  flex: 1,
                }}
              />
              <Text
                style={{
                  fontFamily: 'DMSans-Medium',
                  fontSize: 14,
                  color: colors.textTertiary,
                }}
              >
                kcal
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 13,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Daily Protein
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderLight,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={proteinTarget}
                onChangeText={setProteinTarget}
                keyboardType="number-pad"
                style={{
                  fontFamily: 'JetBrainsMono-Bold',
                  fontSize: 22,
                  color: colors.textPrimary,
                  flex: 1,
                }}
              />
              <Text
                style={{
                  fontFamily: 'DMSans-Medium',
                  fontSize: 14,
                  color: colors.textTertiary,
                }}
              >
                grams
              </Text>
            </View>
          </View>

          {/* Summary card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              marginTop: 8,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 13,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Your Plan
            </Text>
            <View style={{ gap: 8 }}>
              <SummaryRow label="Goals" value={goals.join(', ') || '--'} />
              <SummaryRow label="Level" value={level || '--'} />
              <SummaryRow label="Training" value={frequency > 0 ? `${frequency}x/week - ${suggestedSplit}` : '--'} />
            </View>
          </View>

          {/* Import history prompt */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/import-data' as any); }}
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.primaryMuted,
              borderWidth: 1,
              borderColor: 'rgba(232, 168, 56, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary }}>Bring your history</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Import from Strong, Hevy, Fitbod, or CSV
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M6 3l5 5-5 5" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
      </View>
    );
  }

  function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary }}>
          {label}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans-Medium',
            fontSize: 14,
            color: colors.textPrimary,
            maxWidth: '60%',
            textAlign: 'right',
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    );
  }

  // ─── Step content ────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderGoals();
      case 1:
        return renderLevel();
      case 2:
        return renderBodyStats();
      case 3:
        return renderEquipment();
      case 4:
        return renderFrequency();
      case 5:
        return renderNutrition();
      default:
        return null;
    }
  };

  const getButtonLabel = (): string => {
    if (isLast) return 'Start Training';
    return 'Continue';
  };

  // ─── Main render ─────────────────────────────────────────────

  const enabled = canProceed();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressBar />

          {/* Step indicator */}
          <Text
            style={{
              fontFamily: 'DMSans-Medium',
              fontSize: 13,
              color: colors.textTertiary,
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            Step {step + 1} of {TOTAL_STEPS}
          </Text>

          <View style={{ flex: 1 }}>{renderStep()}</View>

          {/* Bottom buttons */}
          <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 24 }}>
            {step > 0 && (
              <Pressable
                onPress={handleBack}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 16,
                    color: colors.textSecondary,
                  }}
                >
                  Back
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              disabled={!enabled}
              style={{
                flex: step > 0 ? 1.4 : undefined,
                width: step === 0 ? '100%' : undefined,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: enabled ? colors.primary : colors.elevated,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans-Bold',
                  fontSize: 16,
                  color: enabled ? colors.bg : colors.textTertiary,
                }}
              >
                {getButtonLabel()}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
