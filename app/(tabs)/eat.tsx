import React from 'react';
import { ScrollView, View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useNutritionStore } from '@/stores/useNutritionStore';

function CalorieRing() {
  const { calorieTarget, totalCalories, totalProtein, totalCarbs, totalFat, proteinTarget, carbsTarget, fatTarget } = useNutritionStore();
  const consumed = totalCalories();
  const progress = calorieTarget > 0 ? Math.min(consumed / calorieTarget, 1) : 0;
  const circumference = 2 * Math.PI * 68;
  const offset = circumference * (1 - progress);

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
              <View style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%`, height: 5, borderRadius: 3, backgroundColor: m.color }} />
            </View>
          </View>
        ))}
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

  return (
    <Pressable
      onLongPress={() => {
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
            <Text style={{ fontSize: 14 }}>{meal.type === 'breakfast' ? '☀' : meal.type === 'lunch' ? '🍽' : '🍌'}</Text>
          </View>
          <View>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary, textTransform: 'capitalize' }}>{meal.type}</Text>
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

export default function EatScreen() {
  const { meals, remainingCalories, totalProtein, proteinTarget, removeMeal } = useNutritionStore();
  const remaining = remainingCalories();
  const proteinLeft = proteinTarget - totalProtein();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Eat</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <CalorieRing />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Today's Meals</Text>
          <Pressable
            onPress={() => router.push('/camera')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, backgroundColor: colors.primary }}
          >
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.bg }}>Snap Meal</Text>
          </Pressable>
        </View>

        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onDelete={() => removeMeal(meal.id)} />
        ))}

        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(232, 168, 56, 0.06)', borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.1)', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary }}>{remaining > 0 ? `${remaining.toLocaleString()} kcal remaining` : 'Calorie target reached!'}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
            {proteinLeft > 0 ? `You need ~${proteinLeft}g more protein to hit your target.` : 'Protein target reached!'}
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
