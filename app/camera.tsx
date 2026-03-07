import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { analyzeMealPhoto, type ScannedMeal } from '@/lib/meal-scanner';
import { useNutritionStore } from '@/stores/useNutritionStore';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScannedMeal | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 18, color: colors.textPrimary, textAlign: 'center' }}>
          Camera Access Needed
        </Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 }}>
          FitForge uses the camera to snap photos of your meals and automatically estimate calories and macros.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, backgroundColor: colors.primary, marginTop: 8 }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>Grant Permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (!photo?.base64) throw new Error('No photo data');

      const meal = await analyzeMealPhoto(photo.base64);
      setResult(meal);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not analyze photo');
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmMeal = () => {
    if (!result) return;
    const { addMeal } = useNutritionStore.getState();
    addMeal({
      id: Date.now().toString(),
      name: result.name,
      type: result.mealType,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      foods: result.foods.map((f) => ({
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      })),
      totalCalories: result.totalCalories,
      protein: result.totalProtein,
      carbs: result.totalCarbs,
      fat: result.totalFat,
    });
    router.back();
  };

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable onPress={() => setResult(null)}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textSecondary }}>Retake</Text>
          </Pressable>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>Meal Scanned</Text>
          <Pressable onPress={confirmMeal}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.primary }}>Add</Text>
          </Pressable>
        </View>

        {/* Summary card */}
        <View style={{ marginHorizontal: 20, padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 16 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 20, color: colors.textPrimary }}>{result.name}</Text>

          {/* Calorie total */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 36, color: colors.primary }}>{result.totalCalories}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary }}>kcal</Text>
          </View>

          {/* Macros */}
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Protein</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 18, color: colors.success }}>{result.totalProtein}g</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Carbs</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 18, color: colors.primary }}>{result.totalCarbs}g</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fat</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 18, color: colors.warning }}>{result.totalFat}g</Text>
            </View>
          </View>
        </View>

        {/* Food items breakdown */}
        <View style={{ marginHorizontal: 20, marginTop: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          {result.foods.map((food, i) => (
            <View key={i}>
              {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 16 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary }}>{food.name}</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{food.quantity}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: 'JetBrainsMono-SemiBold', fontSize: 14, color: colors.textPrimary }}>{food.calories}</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>
                    P{food.protein} C{food.carbs} F{food.fat}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        <SafeAreaView style={{ flex: 1 }}>
          {/* Top bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                <Path d="M4 4l10 10M14 4L4 14" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: '#fff' }}>Snap Meal</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Center guide */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {analyzing ? (
              <View style={{ padding: 24, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: '#fff' }}>Analyzing meal...</Text>
              </View>
            ) : (
              <View style={{ width: 260, height: 260, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' }} />
            )}
          </View>

          {/* Bottom capture */}
          <View style={{ alignItems: 'center', paddingBottom: 40 }}>
            <Pressable onPress={takePhoto} disabled={analyzing} style={{ opacity: analyzing ? 0.5 : 1 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' }} />
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
