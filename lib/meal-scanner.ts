// Meal photo analysis using Claude Vision API
// NOTE: In production, send the image to your backend/Supabase Edge Function

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '';

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

export async function analyzeMealPhoto(base64Image: string): Promise<ScannedMeal> {
  if (!API_KEY) {
    throw new Error('API key not configured. Set EXPO_PUBLIC_CLAUDE_API_KEY in your environment.');
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this meal photo. Identify each food item and estimate its nutritional content.

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
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON robustly from response
    let parsed: ScannedMeal;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    }
    if (!parsed.name || !parsed.foods || !Array.isArray(parsed.foods)) {
      throw new Error('Invalid meal data structure');
    }
    return parsed;
  } catch (error) {
    console.error('Meal analysis error:', error);
    throw new Error('Could not analyze meal photo. Please try again.');
  }
}
