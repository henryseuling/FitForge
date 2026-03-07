import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import { useAuthStore } from '@/stores/useAuthStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const { session, isLoading, isOnboarded } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'login';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session && !inAuthScreen) {
      router.replace('/login');
    } else if (session && inAuthScreen) {
      if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && inOnboarding && isOnboarded) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, isOnboarded, segments]);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans: DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold': DMSans_700Bold,
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Medium': require('../assets/fonts/JetBrainsMono-Medium.ttf'),
    'JetBrainsMono-SemiBold': require('../assets/fonts/JetBrainsMono-SemiBold.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
    'JetBrainsMono-ExtraBold': require('../assets/fonts/JetBrainsMono-ExtraBold.ttf'),
  });

  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initialize();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  useProtectedRoute();

  if (!loaded || isLoading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="goals" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-meal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="workout-history" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="active-workout" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="settings/edit-personal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/edit-training" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/edit-nutrition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/edit-schedule" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/edit-health" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
