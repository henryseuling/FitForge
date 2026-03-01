import React from 'react';
import { ScrollView, View, Text, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { router } from 'expo-router';

function ProfileCard() {
  const { name, level, height, weight } = useUserStore();
  return (
    <Pressable onPress={() => router.push('/edit-profile')} style={{ marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(232, 168, 56, 0.3)' }}>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 22, color: colors.bg }}>{name ? name[0] : '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 17, color: colors.textPrimary }}>{name}</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{level} · {height} · {weight} lb</Text>
      </View>
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M6 3l5 5-5 5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
  iconBg: string;
  destructive?: boolean;
}

function SettingsRow({ icon, label, value, isToggle, toggleValue, onToggle, onPress, iconBg, destructive }: SettingsRowProps) {
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 15, color: destructive ? colors.danger : colors.textPrimary }}>{label}</Text>
      </View>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.elevated, true: colors.primary }}
          thumbColor="white"
        />
      ) : value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{value}</Text>
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path d="M4.5 2.5l4 3.5-4 3.5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
      </View>
      {React.Children.map(children, (child, i) => (
        <>
          {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 16 }} />}
          {child}
        </>
      ))}
    </View>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected ? colors.success : colors.textTertiary }} />
      <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: connected ? colors.success : colors.textTertiary }}>
        {connected ? 'Connected' : 'Not connected'}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { trainingSplit, restTimerMode, progressiveOverload, macroSplit, toggleProgressiveOverload, integrations } = useUserStore();
  const calorieTarget = useNutritionStore((s) => s.calorieTarget);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Error', error);
            }
          },
        },
      ]
    );
  };

  // Simple colored dot icons
  const goldIcon = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />;
  const greenIcon = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />;
  const redIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M7 12s-5-3.5-5-6.5C2 3.5 3.5 2 5 2c1 0 1.7.6 2 1 .3-.4 1-.9 2-1 1.5 0 3 1.5 3 3.5 0 3-5 6.5-5 6.5z" fill={colors.danger} /></Svg>;
  const ringIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Circle cx={7} cy={7} r={5} stroke={colors.danger} strokeWidth={1.5} /><Circle cx={7} cy={7} r={2} stroke={colors.danger} strokeWidth={1.5} /></Svg>;
  const logoutIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke={colors.danger} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Settings</Text>
        </View>

        <ProfileCard />

        <SettingsSection title="Training">
          <SettingsRow icon={goldIcon} label="Training Split" value={trainingSplit} iconBg={colors.primaryMuted} />
          <SettingsRow icon={goldIcon} label="Rest Timer" value={restTimerMode} iconBg={colors.primaryMuted} />
          <SettingsRow icon={goldIcon} label="Progressive Overload" isToggle toggleValue={progressiveOverload} onToggle={toggleProgressiveOverload} iconBg={colors.primaryMuted} />
        </SettingsSection>

        <SettingsSection title="Nutrition">
          <SettingsRow icon={greenIcon} label="Calorie Target" value={calorieTarget.toLocaleString()} iconBg={colors.successMuted} />
          <SettingsRow icon={greenIcon} label="Macro Split" value={macroSplit} iconBg={colors.successMuted} />
        </SettingsSection>

        <SettingsSection title="Integrations">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.dangerMuted, alignItems: 'center', justifyContent: 'center' }}>{redIcon}</View>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 15, color: colors.textPrimary }}>Apple Health</Text>
            </View>
            <StatusDot connected={integrations.find((i) => i.name === 'Apple Health')?.connected ?? false} />
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.dangerMuted, alignItems: 'center', justifyContent: 'center' }}>{ringIcon}</View>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 15, color: colors.textPrimary }}>Oura Ring</Text>
            </View>
            <StatusDot connected={integrations.find((i) => i.name === 'Oura Ring')?.connected ?? false} />
          </View>
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow
            icon={logoutIcon}
            label="Sign Out"
            iconBg={colors.dangerMuted}
            onPress={handleSignOut}
            destructive
          />
          <SettingsRow
            icon={<Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M3 3l8 8M11 3l-8 8" stroke={colors.danger} strokeWidth={1.5} strokeLinecap="round" /></Svg>}
            label="Delete Account"
            iconBg={colors.dangerMuted}
            onPress={handleDeleteAccount}
            destructive
          />
        </SettingsSection>

        <View style={{ alignItems: 'center', paddingVertical: 20, gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textTertiary }}>FitForge</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>Version 1.0.0 · Powered by Claude</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
