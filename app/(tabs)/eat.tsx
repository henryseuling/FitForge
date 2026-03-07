import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Alert, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { fetchGoals } from '@/lib/api';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useUserStore } from '@/stores/useUserStore';
import { getAIMealSuggestion } from '@/lib/workoutEngine';

function CalorieRing() {
  const { calorieTarget, totalCalories, remainingCalories } = useNutritionStore();
  const consumed = totalCalories();
  const remaining = remainingCalories();
  const isOver = remaining < 0;
  const progress = calorieTarget > 0 ? Math.min(consumed / calorieTarget, 1) : 0;
  const circumference = 2 * Math.PI * 68;
  const offset = Math.max(circumference * (1 - progress), 0);
  const ringColor = isOver ? colors.danger : colors.primary;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Circle cx={80} cy={80} r={68} fill="none" stroke={colors.elevated} strokeWidth={10} />
          <Circle cx={80} cy={80} r={68} fill="none" stroke={ringColor} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} rotation={-90} origin="80,80" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 36, color: ringColor }}>{isOver ? Math.abs(remaining) : remaining}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: isOver ? colors.danger : colors.textSecondary, marginTop: 2 }}>{isOver ? 'over' : 'remaining'}</Text>
        </View>
      </View>
    </View>
  );
}

function MacroProgressBars() {
  const { totalProtein, totalCarbs, totalFat, proteinTarget, carbsTarget, fatTarget } = useNutritionStore();

  const macros = [
    { label: 'Protein', current: totalProtein(), target: proteinTarget, color: '#3B82F6', unit: 'g' },
    { label: 'Carbs', current: totalCarbs(), target: carbsTarget, color: colors.primary, unit: 'g' },
    { label: 'Fat', current: totalFat(), target: fatTarget, color: '#EC4899', unit: 'g' },
  ];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 16, gap: 16 }}>
      {macros.map((macro) => {
        const percentage = Math.min((macro.current / macro.target) * 100, 100);
        return (
          <View key={macro.label} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textPrimary }}>{macro.label}</Text>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary }}>
                <Text style={{ color: macro.color, fontFamily: 'DMSans-Bold' }}>{macro.current}</Text>
                <Text>/{macro.target}{macro.unit}</Text>
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.elevated, overflow: 'hidden' }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: macro.color,
                  width: `${percentage}%`,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WaterTracker() {
  const { waterGlasses, setWaterGlasses } = useNutritionStore();
  const target = 8;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Water Tracker</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{waterGlasses}/{target} glasses</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {Array.from({ length: target }).map((_, index) => (
          <Pressable
            key={index}
            onPress={() => {
              if (index < waterGlasses) {
                setWaterGlasses(index);
              } else {
                setWaterGlasses(index + 1);
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{
              flex: 1,
              aspectRatio: 0.6,
              borderRadius: 8,
              backgroundColor: index < waterGlasses ? '#3B82F6' : colors.elevated,
              borderWidth: 1,
              borderColor: index < waterGlasses ? '#3B82F6' : 'rgba(255,255,255,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: index < waterGlasses ? 1 : 0.6,
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M8 2C6 4 4 6 4 9a4 4 0 008 0c0-3-2-5-4-7z"
                fill={index < waterGlasses ? '#ffffff' : colors.textTertiary}
              />
            </Svg>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MealCard({ meal, onDelete }: { meal: any; onDelete: () => void }) {
  const iconColors: Record<string, string> = {
    breakfast: colors.primary,
    lunch: '#10B981',
    dinner: '#EF4444',
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
      style={{ marginHorizontal: 20, marginVertical: 6, padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: iconColor }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>{typeLabels[meal.type] || meal.type}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>{meal.time}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textPrimary }}>{meal.totalCalories}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 10, color: colors.textTertiary }}>kcal</Text>
        </View>
      </View>
      <View style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.elevated, flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary }}>Protein</Text>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#3B82F6', marginTop: 2 }}>{meal.protein}g</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary }}>Carbs</Text>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.primary, marginTop: 2 }}>{meal.carbs}g</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary }}>Fat</Text>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#EC4899', marginTop: 2 }}>{meal.fat}g</Text>
        </View>
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
  const { goals: profileGoals } = useUserStore();
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

      const liveGoals = await fetchGoals().catch(() => []);
      const goalTitles = liveGoals
        .map((goal) => goal?.title?.trim())
        .filter((goal): goal is string => Boolean(goal));
      const goalSummary = goalTitles.join(', ') || profileGoals.join(', ') || 'General Fitness';

      const result = await getAIMealSuggestion({
        remainingCalories: remaining,
        remainingProtein: proteinTarget - totalProtein(),
        remainingCarbs: carbsTarget - totalCarbs(),
        remainingFat: fatTarget - totalFat(),
        mealType,
        goal: goalSummary,
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 32, color: colors.textPrimary, letterSpacing: -0.8 }}>Eat</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 4 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/camera'); }}
            accessibilityRole="button"
            accessibilityLabel="Scan a meal with camera"
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx={12} cy={13} r={4} stroke={colors.bg} strokeWidth={2} />
            </Svg>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>Scan Meal</Text>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/add-meal'); }}
            accessibilityRole="button"
            accessibilityLabel="Add meal manually"
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 5v14M5 12h14" stroke={colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.textPrimary }}>Add Meal</Text>
          </Pressable>
        </View>

        <CalorieRing />
        <MacroProgressBars />
        <WaterTracker />
        <AIMealSuggestionCard />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Today's Meals</Text>
        </View>

        {meals.length === 0 ? (
          <EmptyMeals />
        ) : (
          meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={() => removeMeal(meal.id)} />
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
