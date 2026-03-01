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
import { colors } from '@/lib/theme';
import { useNutritionStore } from '@/stores/useNutritionStore';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

interface FoodItem {
  id: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function createEmptyFood(): FoodItem {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  };
}

export default function AddMealScreen() {
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([createEmptyFood()]);

  const updateFoodItem = useCallback((id: string, field: keyof FoodItem, value: string) => {
    setFoodItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const addFoodItem = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFoodItems((prev) => [...prev, createEmptyFood()]);
  }, []);

  const removeFoodItem = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFoodItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const parseNum = (val: string) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const totalCals = foodItems.reduce((sum, f) => sum + parseNum(f.calories), 0);
  const totalProtein = foodItems.reduce((sum, f) => sum + parseNum(f.protein), 0);
  const totalCarbs = foodItems.reduce((sum, f) => sum + parseNum(f.carbs), 0);
  const totalFat = foodItems.reduce((sum, f) => sum + parseNum(f.fat), 0);

  const hasValidFood = foodItems.some((f) => f.name.trim().length > 0 && parseNum(f.calories) > 0);
  const canSave = mealType !== null && hasValidFood;

  const handleSave = () => {
    if (!canSave || !mealType) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const validFoods = foodItems.filter(
      (f) => f.name.trim().length > 0 && parseNum(f.calories) > 0
    );

    useNutritionStore.getState().addMeal({
      id: Date.now().toString(),
      type: mealType,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      foods: validFoods.map((f) => ({ name: f.name.trim(), calories: parseNum(f.calories) })),
      totalCalories: totalCals,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    });

    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.elevated,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text
              style={{
                fontFamily: 'DMSans-Medium',
                fontSize: 16,
                color: colors.textSecondary,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: 'DMSans-Bold',
              fontSize: 18,
              color: colors.textPrimary,
            }}
          >
            Log Meal
          </Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: canSave ? colors.primary : colors.textTertiary,
              }}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Type Selector */}
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 14,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Meal Type
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {MEAL_TYPES.map((type) => {
                const isSelected = mealType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMealType(type);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : colors.elevated,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? 'DMSans-SemiBold' : 'DMSans-Medium',
                        fontSize: 13,
                        color: isSelected ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Food Items */}
          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 14,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Food Items
            </Text>

            {foodItems.map((food, index) => (
              <View
                key={food.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.elevated,
                }}
              >
                {/* Food name row with remove button */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      fontFamily: 'DMSans-Medium',
                      fontSize: 16,
                      color: colors.textPrimary,
                      backgroundColor: colors.elevated,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                    placeholder={`Food item ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    value={food.name}
                    onChangeText={(v) => updateFoodItem(food.id, 'name', v)}
                  />
                  {foodItems.length > 1 && (
                    <Pressable
                      onPress={() => removeFoodItem(food.id)}
                      hitSlop={8}
                      style={{
                        marginLeft: 10,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(248, 113, 113, 0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M18 6L6 18M6 6l12 12"
                          stroke={colors.danger}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Pressable>
                  )}
                </View>

                {/* Macro inputs grid */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { key: 'calories' as const, label: 'Cals', color: colors.primary },
                    { key: 'protein' as const, label: 'Protein', color: colors.success },
                    { key: 'carbs' as const, label: 'Carbs', color: colors.warning },
                    { key: 'fat' as const, label: 'Fat', color: colors.danger },
                  ].map((macro) => (
                    <View key={macro.key} style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'DMSans-Medium',
                          fontSize: 11,
                          color: macro.color,
                          marginBottom: 4,
                          textAlign: 'center',
                        }}
                      >
                        {macro.label}
                      </Text>
                      <TextInput
                        style={{
                          fontFamily: 'JetBrainsMono-Bold',
                          fontSize: 14,
                          color: colors.textPrimary,
                          backgroundColor: colors.elevated,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 10,
                          textAlign: 'center',
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={food[macro.key]}
                        onChangeText={(v) => updateFoodItem(food.id, macro.key, v)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Add Food Item Button */}
            <Pressable
              onPress={addFoodItem}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: colors.elevated,
                borderStyle: 'dashed',
                backgroundColor: colors.surface,
                marginTop: 4,
              }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5v14M5 12h14"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 15,
                  color: colors.primary,
                }}
              >
                Add Food Item
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Running Totals Bar */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.elevated,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[
              { label: 'Calories', value: totalCals, unit: 'kcal', color: colors.primary },
              { label: 'Protein', value: totalProtein, unit: 'g', color: colors.success },
              { label: 'Carbs', value: totalCarbs, unit: 'g', color: colors.warning },
              { label: 'Fat', value: totalFat, unit: 'g', color: colors.danger },
            ].map((stat) => (
              <View key={stat.label} style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 11,
                    color: colors.textTertiary,
                    marginBottom: 4,
                  }}
                >
                  {stat.label}
                </Text>
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono-Bold',
                    fontSize: 18,
                    color: stat.color,
                  }}
                >
                  {Math.round(stat.value)}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 11,
                    color: colors.textTertiary,
                    marginTop: 2,
                  }}
                >
                  {stat.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
