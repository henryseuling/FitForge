import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useUserStore } from '@/stores/useUserStore';
import { getAIMealSuggestion } from '@/lib/workoutEngine';

function CalorieRing() {
  const { calorieTarget, totalCalories, totalProtein, totalCarbs, totalFat, proteinTarget, carbsTarget, fatTarget } = useNutritionStore();
  const consumed = totalCalories();
  const progress = calorieTarget > 0 ? Math.min(consumed / calorieTarget, 1) : 0;
  const circumference = 2 * Math.PI * 68;
  const offset = Math.max(circumference * (1 - progress), 0);

  const macros = [
    { label: 'Protein', value: totalProtein(), target: proteinTarget, color: colors.success },
    { label: 'Carbs', value: totalCarbs(), target: carbsTarget, color: colors.primary },
    { label: 'Fat', value: totalFat(), target: fatTarget, color: colors.warning },
  ];

  return (
    <View style={{ marginHorizontal: 20, padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Circle cx={80} cy={80} r={68} fill="none" stroke={colors.elevated} strokeWidth={10} />
          <Circle cx={80} cy={80} r={68} fill="none" stroke={colors.primary} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} rotation={-90} origin="80,80" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 32, color: colors.textPrimary }}>{consumed.toLocaleString()}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>of {calorieTarget.toLocaleString()} kcal</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 20, gap: 24 }}>
        {macros.map((m) => (
          <View key={m.label} style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>{m.label}</Text>
            <Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 18, color: m.color }}>{m.value}</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>g</Text>
            </Text>
            <View style={{ width: 56, height: 5, borderRadius: 3, backgroundColor: colors.elevated, overflow: 'hidden' }}>
              <View style={{ width: `${m.target > 0 ? Math.min((m.value / m.target) * 100, 100) : 0}%`, height: 5, borderRadius: 3, backgroundColor: m.color }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function WaterTracker() {
  const { waterGlasses, setWaterGlasses } = useNutritionStore();
  const target = 8;
  const progress = Math.min(waterGlasses / target, 1);

  return (
    <View style={{ marginHorizontal: 20, marginTop: 8, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(96, 165, 250, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M8 2C6 4 4 6 4 9a4 4 0 008 0c0-3-2-5-4-7z" fill="#60A5FA" />
            </Svg>
          </View>
          <View>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Water</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{waterGlasses}/{target} glasses</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => { if (waterGlasses > 0) { setWaterGlasses(waterGlasses - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textSecondary }}>-</Text>
          </Pressable>
          <Pressable
            onPress={() => { setWaterGlasses(waterGlasses + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(96, 165, 250, 0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: '#60A5FA' }}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.elevated, marginTop: 12 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: '#60A5FA', width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}

function MealCard({ meal, onDelete }: { meal: any; onDelete: () => void }) {
  const iconColors: Record<string, string> = {
    breakfast: colors.primary,
    lunch: colors.success,
    dinner: colors.danger,
    snack: colors.warning,
  };
  const iconColor = iconColors[meal.type] || colors.textSecondary;
  const typeLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Delete Meal', `Remove this ${meal.type}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
      }}
      style={{ marginHorizontal: 20, marginVertical: 4, padding: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 10 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconColor + '1A', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: iconColor }} />
          </View>
          <View>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>{typeLabels[meal.type] || meal.type}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{meal.time}</Text>
          </View>
        </View>
        <Text>
          <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 16, color: colors.textPrimary }}>{meal.totalCalories} </Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>kcal</Text>
        </Text>
      </View>
      {meal.foods.length > 1 && (
        <View style={{ padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.elevated, gap: 6 }}>
          {meal.foods.map((food: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{food.name}</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: colors.textSecondary }}>{food.calories}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.success }}>P {meal.protein}g</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.primary }}>C {meal.carbs}g</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.warning }}>F {meal.fat}g</Text>
      </View>
    </Pressable>
  );
}

function EmptyMeals() {
  return (
    <View style={{ marginHorizontal: 20, marginVertical: 8, padding: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary }}>No meals logged yet</Text>
      <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Snap a photo or add a meal manually to start tracking.</Text>
    </View>
  );
}

function AIMealSuggestionCard() {
  const { remainingCalories, totalProtein, totalCarbs, totalFat, proteinTarget, carbsTarget, fatTarget } = useNutritionStore();
  const { goals } = useUserStore();
  const remaining = remainingCalories();
  const [suggestion, setSuggestion] = useState<{ mealName: string; description: string; calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetSuggestion = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Determine meal type based on time of day
      const hour = new Date().getHours();
      let mealType = 'snack';
      if (hour < 10) mealType = 'breakfast';
      else if (hour < 14) mealType = 'lunch';
      else if (hour < 20) mealType = 'dinner';

      const result = await getAIMealSuggestion({
        remainingCalories: remaining,
        remainingProtein: proteinTarget - totalProtein(),
        remainingCarbs: carbsTarget - totalCarbs(),
        remainingFat: fatTarget - totalFat(),
        mealType,
        goal: goals.join(', ') || 'General Fitness',
      });
      setSuggestion(result);
    } catch {
      setSuggestion({
        mealName: 'Grilled Chicken Bowl',
        description: 'Grilled chicken breast over brown rice with steamed vegetables.',
        calories: Math.round(remaining * 0.4),
        protein: Math.round((proteinTarget - totalProtein()) * 0.4),
        carbs: Math.round((carbsTarget - totalCarbs()) * 0.4),
        fat: Math.round((fatTarget - totalFat()) * 0.4),
      });
    }
    setLoading(false);
  };

  if (remaining <= 0) return null;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 8, gap: 8 }}>
      {!suggestion ? (
        <Pressable
          onPress={handleGetSuggestion}
          disabled={loading}
          style={{ padding: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.primary }}>AI</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>{loading ? 'Finding a meal...' : 'Get a meal idea'}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>AI-powered suggestion based on your remaining macros</Text>
          </View>
          {!loading && (
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M4.5 2.5l4 3.5-4 3.5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
      ) : (
        <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.12)', gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.7 }}>AI Suggestion</Text>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textPrimary }}>{suggestion.mealName}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.primaryMuted }}>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 13, color: colors.primary }}>{suggestion.calories} kcal</Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, lineHeight: 19, color: colors.textSecondary }}>{suggestion.description}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.success }}>P {suggestion.protein}g</Text>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.primary }}>C {suggestion.carbs}g</Text>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.warning }}>F {suggestion.fat}g</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setSuggestion(null)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.elevated }}
            >
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textSecondary }}>Try Another</Text>
            </Pressable>
            <Pressable
              onPress={() => { router.push('/chat'); }}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primaryMuted }}
            >
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary }}>Ask Coach</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function EatScreen() {
  const { meals, remainingCalories, totalProtein, proteinTarget, removeMeal } = useNutritionStore();
  const remaining = remainingCalories();
  const proteinLeft = Math.max(proteinTarget - totalProtein(), 0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await useNutritionStore.getState().loadNutrition();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Eat</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <CalorieRing />
        <WaterTracker />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Today's Meals</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/add-meal'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.textSecondary }}>+ Add</Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/camera'); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, backgroundColor: colors.primary }}
            >
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.bg }}>Snap Meal</Text>
            </Pressable>
          </View>
        </View>

        {meals.length === 0 ? (
          <EmptyMeals />
        ) : (
          meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={() => removeMeal(meal.id)} />
          ))
        )}

        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(232, 168, 56, 0.06)', borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.1)', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary }}>{remaining > 0 ? `${remaining.toLocaleString()} kcal remaining` : 'Calorie target reached!'}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
            {proteinLeft > 0 ? `You need ~${proteinLeft}g more protein to hit your target.` : `Protein target reached!`}
          </Text>
        </View>

        {/* AI Meal Suggestion */}
        <AIMealSuggestionCard />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
