// Meal photo analysis uses the server-side AI gateway.

import { invokeVisionAI } from './aiGateway';
import { extractJsonPayload } from './json';

export interface ScannedMeal {
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: string;
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function validateScannedMeal(candidate: unknown): ScannedMeal {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Invalid meal payload');
  }

  const meal = candidate as Partial<ScannedMeal>;
  const mealType = meal.mealType;
  const foods = Array.isArray(meal.foods) ? meal.foods : [];

  if (
    typeof meal.name !== 'string' ||
    !meal.name.trim() ||
    !mealType ||
    !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)
  ) {
    throw new Error('Meal response is missing required fields');
  }

  return {
    name: meal.name.trim(),
    mealType,
    foods: foods
      .filter((food): food is NonNullable<ScannedMeal['foods'][number]> => !!food && typeof food === 'object')
      .map((food) => ({
        name: typeof food.name === 'string' && food.name.trim() ? food.name.trim() : 'Food item',
        calories: normalizeNumber(food.calories),
        protein: normalizeNumber(food.protein),
        carbs: normalizeNumber(food.carbs),
        fat: normalizeNumber(food.fat),
        quantity: typeof food.quantity === 'string' && food.quantity.trim() ? food.quantity.trim() : '1 serving',
      })),
    totalCalories: normalizeNumber(meal.totalCalories),
    totalProtein: normalizeNumber(meal.totalProtein),
    totalCarbs: normalizeNumber(meal.totalCarbs),
    totalFat: normalizeNumber(meal.totalFat),
  };
}

export async function analyzeMealPhoto(base64Image: string): Promise<ScannedMeal> {
  try {
    const { text } = await invokeVisionAI({
      imageBase64: base64Image,
      mediaType: 'image/jpeg',
      maxTokens: 1024,
      prompt: `Analyze this meal photo. Identify each food item and estimate its nutritional content.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "Brief meal name",
  "mealType": "breakfast|lunch|dinner|snack",
  "foods": [
    {
      "name": "Food item name",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "quantity": "1 cup"
    }
  ],
  "totalCalories": 0,
  "totalProtein": 0,
  "totalCarbs": 0,
  "totalFat": 0
}

Be accurate with portion estimates. Round macros to whole numbers.`,
    });

    return validateScannedMeal(extractJsonPayload<ScannedMeal>(text));
  } catch (error) {
    console.error('Meal analysis error:', error);
    throw new Error('Could not analyze meal photo. Please try again.');
  }
}
