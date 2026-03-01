import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.textPrimary }}>This screen doesn't exist.</Text>
        <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
          <Text style={{ fontSize: 14, color: colors.primary }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
