import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  fetchTodayMeals,
  fetchNutritionTargets,
  logMeal as apiLogMeal,
  updateNutritionTargets as apiUpdateTargets,
} from '@/lib/api';

export interface FoodItem {
  name: string;
  calories: number;
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  foods: FoodItem[];
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionState {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  meals: Meal[];

  // Computed
  totalCalories: () => number;
  totalProtein: () => number;
  totalCarbs: () => number;
  totalFat: () => number;
  remainingCalories: () => number;

  // Actions
  addMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
  updateTargets: (targets: Partial<{ calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number }>) => void;
  loadNutrition: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE = {
  calorieTarget: 2000,
  proteinTarget: 150,
  carbsTarget: 250,
  fatTarget: 65,
  meals: [] as Meal[],
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  ...INITIAL_STATE,

  totalCalories: () => get().meals.reduce((sum, m) => sum + m.totalCalories, 0),
  totalProtein: () => get().meals.reduce((sum, m) => sum + m.protein, 0),
  totalCarbs: () => get().meals.reduce((sum, m) => sum + m.carbs, 0),
  totalFat: () => get().meals.reduce((sum, m) => sum + m.fat, 0),
  remainingCalories: () => get().calorieTarget - get().totalCalories(),

  addMeal: (meal) => {
    set((state) => ({ meals: [...state.meals, meal] }));
    // Persist to Supabase
    apiLogMeal(
      meal.type,
      meal.type,
      meal.foods.map((f) => ({
        name: f.name,
        calories: f.calories,
        protein: 0,
        carbs: 0,
        fat: 0,
      }))
    ).catch(() => {});
  },

  removeMeal: (mealId) => {
    set((state) => ({ meals: state.meals.filter((m) => m.id !== mealId) }));
    // Delete from Supabase
    supabase.from('meals').delete().eq('id', mealId).then(() => {}).catch(() => {});
  },

  updateTargets: (targets) => {
    set((state) => ({ ...state, ...targets }));
    // Persist to Supabase (map camelCase to snake_case)
    const snakeTargets: Record<string, number> = {};
    if (targets.calorieTarget !== undefined) snakeTargets.calorie_target = targets.calorieTarget;
    if (targets.proteinTarget !== undefined) snakeTargets.protein_target = targets.proteinTarget;
    if (targets.carbsTarget !== undefined) snakeTargets.carbs_target = targets.carbsTarget;
    if (targets.fatTarget !== undefined) snakeTargets.fat_target = targets.fatTarget;
    apiUpdateTargets(snakeTargets).catch(() => {});
  },

  loadNutrition: async () => {
    try {
      // Load targets and today's meals in parallel
      const [targets, meals] = await Promise.all([
        fetchNutritionTargets().catch(() => null),
        fetchTodayMeals().catch(() => []),
      ]);

      const updates: Partial<typeof INITIAL_STATE> = {};

      if (targets) {
        if (targets.calorie_target) updates.calorieTarget = targets.calorie_target;
        if (targets.protein_target) updates.proteinTarget = targets.protein_target;
        if (targets.carbs_target) updates.carbsTarget = targets.carbs_target;
        if (targets.fat_target) updates.fatTarget = targets.fat_target;
      }

      if (meals && meals.length > 0) {
        updates.meals = meals.map((m: any) => ({
          id: m.id,
          type: m.meal_type || 'snack',
          time: new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          foods: (m.food_items || []).map((f: any) => ({ name: f.name, calories: f.calories })),
          totalCalories: (m.food_items || []).reduce((sum: number, f: any) => sum + (f.calories || 0), 0),
          protein: (m.food_items || []).reduce((sum: number, f: any) => sum + (f.protein || 0), 0),
          carbs: (m.food_items || []).reduce((sum: number, f: any) => sum + (f.carbs || 0), 0),
          fat: (m.food_items || []).reduce((sum: number, f: any) => sum + (f.fat || 0), 0),
        }));
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch {
      // Keep defaults on error
    }
  },

  reset: () => set(INITIAL_STATE),
}));
