import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useNutritionStore } from '@/stores/useNutritionStore';

export default function EditNutritionScreen() {
  const nutrition = useNutritionStore();

  const [calories, setCalories] = useState(nutrition.calorieTarget.toString());
  const [protein, setProtein] = useState(nutrition.proteinTarget.toString());
  const [carbs, setCarbs] = useState(nutrition.carbsTarget.toString());
  const [fat, setFat] = useState(nutrition.fatTarget.toString());
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Calculate macros when calories or protein change
  useEffect(() => {
    if (!autoCalculate) return;

    const cals = parseInt(calories) || 0;
    const prot = parseInt(protein) || 0;

    if (cals > 0 && prot > 0) {
      const proteinCals = prot * 4;
      const remainingCals = cals - proteinCals;

      if (remainingCals > 0) {
        const carbsTarget = Math.round((remainingCals * 0.55) / 4);
        const fatTarget = Math.round((remainingCals * 0.45) / 9);
        setCarbs(carbsTarget.toString());
        setFat(fatTarget.toString());
      }
    }
  }, [calories, protein, autoCalculate]);

  const handleSave = () => {
    const cals = parseInt(calories) || 0;
    const prot = parseInt(protein) || 0;
    const carbsVal = parseInt(carbs) || 0;
    const fatVal = parseInt(fat) || 0;

    if (cals <= 0) {
      Alert.alert('Invalid Calories', 'Please enter a valid calorie target.');
      return;
    }

    if (prot <= 0) {
      Alert.alert('Invalid Protein', 'Please enter a valid protein target.');
      return;
    }

    if (carbsVal < 0 || fatVal < 0) {
      Alert.alert('Invalid Macros', 'Carbs and fat cannot be negative.');
      return;
    }

    useNutritionStore.getState().updateTargets({
      calorieTarget: cals,
      proteinTarget: prot,
      carbsTarget: carbsVal,
      fatTarget: fatVal,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  function FieldLabel({ text }: { text: string }) {
    return (
      <Text
        style={{
          fontFamily: 'DMSans-Medium',
          fontSize: 11,
          color: colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        }}
      >
        {text}
      </Text>
    );
  }

  function MacroInputField({
    value,
    onChangeText,
    placeholder,
    unit,
  }: {
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    unit: string;
  }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={{
            flex: 1,
            fontFamily: 'DMSans',
            fontSize: 15,
            color: colors.textPrimary,
            paddingVertical: 14,
          }}
        />
        <Text
          style={{
            fontFamily: 'DMSans-SemiBold',
            fontSize: 13,
            color: colors.textTertiary,
            marginLeft: 8,
          }}
        >
          {unit}
        </Text>
      </View>
    );
  }

  function MacroCard({
    title,
    value,
    unit,
    color,
    percentage,
    onEdit,
  }: {
    title: string;
    value: number;
    unit: string;
    color: string;
    percentage?: number;
    onEdit?: () => void;
  }) {
    return (
      <Pressable
        onPress={onEdit}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 11,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                marginBottom: 4,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans-Bold',
                fontSize: 22,
                color: colors.textPrimary,
              }}
            >
              {value}
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginLeft: 4,
                }}
              >
                {unit}
              </Text>
            </Text>
          </View>
          {percentage !== undefined && (
            <View
              style={{
                backgroundColor: color,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 12,
                  color: colors.bg,
                }}
              >
                {percentage}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  const cals = parseInt(calories) || 0;
  const prot = parseInt(protein) || 0;
  const carbsVal = parseInt(carbs) || 0;
  const fatVal = parseInt(fat) || 0;

  const proteinPercentage = cals > 0 ? Math.round((prot * 4) / cals * 100) : 0;
  const carbsPercentage = cals > 0 ? Math.round((carbsVal * 4) / cals * 100) : 0;
  const fatPercentage = cals > 0 ? Math.round((fatVal * 9) / cals * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing nutrition targets"
          >
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 15,
                color: colors.textSecondary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: 'DMSans-Bold',
              fontSize: 18,
              color: colors.textPrimary,
            }}
          >
            Nutrition Targets
          </Text>
          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save nutrition targets"
          >
            <Text
              style={{
                fontFamily: 'DMSans-Bold',
                fontSize: 15,
                color: colors.primary,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            gap: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Primary Targets */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              Daily Targets
            </Text>

            <View style={{ gap: 6 }}>
              <FieldLabel text="Daily Calories" />
              <MacroInputField
                value={calories}
                onChangeText={setCalories}
                placeholder="2000"
                unit="kcal"
              />
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginTop: 4,
                }}
              >
                Your daily energy expenditure target
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <FieldLabel text="Protein Target" />
              <MacroInputField
                value={protein}
                onChangeText={setProtein}
                placeholder="150"
                unit="g"
              />
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginTop: 4,
                }}
              >
                Protein supports muscle growth and recovery
              </Text>
            </View>
          </View>

          {/* Auto Calculate Toggle */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: 'DMSans-Medium',
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              >
                Auto-Calculate Macros
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 11,
                  color: colors.textTertiary,
                }}
              >
                55% carbs, 45% fat of remaining calories
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setAutoCalculate(!autoCalculate);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: autoCalculate
                    ? colors.primary
                    : colors.elevated,
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'white',
                    marginLeft: autoCalculate ? 24 : 0,
                  }}
                />
              </View>
            </Pressable>
          </View>

          {/* Carbs & Fat */}
          {!autoCalculate && (
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
              >
                Secondary Targets
              </Text>

              <View style={{ gap: 6 }}>
                <FieldLabel text="Carbs Target" />
                <MacroInputField
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="250"
                  unit="g"
                />
              </View>

              <View style={{ gap: 6 }}>
                <FieldLabel text="Fat Target" />
                <MacroInputField
                  value={fat}
                  onChangeText={setFat}
                  placeholder="65"
                  unit="g"
                />
              </View>
            </View>
          )}

          {/* Macro Breakdown */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              Macro Breakdown
            </Text>

            <View style={{ gap: 10 }}>
              <MacroCard
                title="Protein"
                value={prot}
                unit="g"
                color={colors.success}
                percentage={proteinPercentage}
              />
              <MacroCard
                title="Carbohydrates"
                value={carbsVal}
                unit="g"
                color={colors.warning}
                percentage={carbsPercentage}
              />
              <MacroCard
                title="Fat"
                value={fatVal}
                unit="g"
                color={colors.primary}
                percentage={fatPercentage}
              />
            </View>
          </View>

          {/* Current vs New Comparison */}
          <View
            style={{
              backgroundColor: colors.elevated,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
              gap: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 11,
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.7,
              }}
            >
              Current vs New
            </Text>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Calories:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: colors.textPrimary,
                    }}
                  >
                    {nutrition.calorieTarget}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans',
                      fontSize: 11,
                      color: colors.textTertiary,
                    }}
                  >
                    →
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: cals !== nutrition.calorieTarget ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {cals || '—'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Protein:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: colors.textPrimary,
                    }}
                  >
                    {nutrition.proteinTarget}g
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans',
                      fontSize: 11,
                      color: colors.textTertiary,
                    }}
                  >
                    →
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: prot !== nutrition.proteinTarget ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {prot || '—'}g
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Carbs:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: colors.textPrimary,
                    }}
                  >
                    {nutrition.carbsTarget}g
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans',
                      fontSize: 11,
                      color: colors.textTertiary,
                    }}
                  >
                    →
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: carbsVal !== nutrition.carbsTarget ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {carbsVal || '—'}g
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  Fat:
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: colors.textPrimary,
                    }}
                  >
                    {nutrition.fatTarget}g
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans',
                      fontSize: 11,
                      color: colors.textTertiary,
                    }}
                  >
                    →
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans-SemiBold',
                      fontSize: 13,
                      color: fatVal !== nutrition.fatTarget ? colors.primary : colors.textTertiary,
                    }}
                  >
                    {fatVal || '—'}g
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
