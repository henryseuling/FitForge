import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Switch, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useAuthStore } from '@/stores/useAuthStore';

function ProfileCard() {
  const { name, level, height, weight, units } = useUserStore();
  const weightLabel = units === 'metric' ? 'kg' : 'lb';
  return (
    <Pressable
      onPress={() => router.push('/edit-profile')}
      style={{ marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 14 }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(232, 168, 56, 0.3)' }}>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 22, color: colors.bg }}>{name ? name[0].toUpperCase() : '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 17, color: colors.textPrimary }}>{name || 'Set up profile'}</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
          {level ? `${level} · ${height} · ${weight} ${weightLabel}` : 'Tap to edit'}
        </Text>
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
          {onPress && (
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path d="M4.5 2.5l4 3.5-4 3.5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </View>
      ) : onPress ? (
        <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <Path d="M4.5 2.5l4 3.5-4 3.5" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
        {content}
      </Pressable>
    );
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

const REST_TIMER_OPTIONS = [60, 90, 120, 150, 180];

export default function SettingsScreen() {
  const {
    trainingSplit, restTimerDuration, progressiveOverload, macroSplit,
    toggleProgressiveOverload, toggleUnits, toggleNotifications, setRestTimerDuration,
    units, notifications, integrations,
  } = useUserStore();
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
            if (error) Alert.alert('Error', error);
          },
        },
      ]
    );
  };

  const handleRestTimerChange = () => {
    const currentIndex = REST_TIMER_OPTIONS.indexOf(restTimerDuration);
    const nextIndex = (currentIndex + 1) % REST_TIMER_OPTIONS.length;
    setRestTimerDuration(REST_TIMER_OPTIONS[nextIndex]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExportData = async () => {
    try {
      const userState = useUserStore.getState();
      const nutritionState = useNutritionStore.getState();
      const exportData = {
        profile: {
          name: userState.name,
          level: userState.level,
          height: userState.height,
          weight: userState.weight,
          age: userState.age,
          gender: userState.gender,
          goals: userState.goals,
          trainingSplit: userState.trainingSplit,
        },
        nutrition: {
          calorieTarget: nutritionState.calorieTarget,
          proteinTarget: nutritionState.proteinTarget,
          mealsToday: nutritionState.meals.length,
          totalCaloriesToday: nutritionState.totalCalories(),
        },
        exportedAt: new Date().toISOString(),
      };
      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'FitForge Data Export',
      });
    } catch {
      // User cancelled
    }
  };

  const formatRestTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  };

  // Icons
  const goldDot = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />;
  const greenDot = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />;
  const redIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M7 12s-5-3.5-5-6.5C2 3.5 3.5 2 5 2c1 0 1.7.6 2 1 .3-.4 1-.9 2-1 1.5 0 3 1.5 3 3.5 0 3-5 6.5-5 6.5z" fill={colors.danger} /></Svg>;
  const ringIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Circle cx={7} cy={7} r={5} stroke={colors.danger} strokeWidth={1.5} /><Circle cx={7} cy={7} r={2} stroke={colors.danger} strokeWidth={1.5} /></Svg>;
  const logoutIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke={colors.danger} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  const deleteIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Path d="M3 3l8 8M11 3l-8 8" stroke={colors.danger} strokeWidth={1.5} strokeLinecap="round" /></Svg>;
  const rulerIcon = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />;
  const bellIcon = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />;
  const exportIcon = <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary }} />;
  const targetIcon = <Svg width={14} height={14} viewBox="0 0 14 14" fill="none"><Circle cx={7} cy={7} r={5} stroke={colors.success} strokeWidth={1.5} /><Circle cx={7} cy={7} r={2} fill={colors.success} /></Svg>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Settings</Text>
        </View>

        <ProfileCard />

        <SettingsSection title="Training">
          <SettingsRow
            icon={goldDot}
            label="Training Split"
            value={trainingSplit || 'Not set'}
            iconBg={colors.primaryMuted}
            onPress={() => router.push('/edit-profile')}
          />
          <SettingsRow
            icon={goldDot}
            label="Rest Timer"
            value={formatRestTimer(restTimerDuration)}
            iconBg={colors.primaryMuted}
            onPress={handleRestTimerChange}
          />
          <SettingsRow
            icon={goldDot}
            label="Progressive Overload"
            isToggle
            toggleValue={progressiveOverload}
            onToggle={() => { toggleProgressiveOverload(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            iconBg={colors.primaryMuted}
          />
        </SettingsSection>

        <SettingsSection title="Nutrition">
          <SettingsRow
            icon={greenDot}
            label="Calorie Target"
            value={calorieTarget.toLocaleString()}
            iconBg={colors.successMuted}
            onPress={() => router.push('/edit-profile')}
          />
          <SettingsRow
            icon={greenDot}
            label="Macro Split"
            value={macroSplit || 'Balanced'}
            iconBg={colors.successMuted}
            onPress={() => router.push('/edit-profile')}
          />
        </SettingsSection>

        <SettingsSection title="Goals">
          <SettingsRow
            icon={targetIcon}
            label="My Goals"
            iconBg={colors.successMuted}
            onPress={() => router.push('/goals')}
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow
            icon={rulerIcon}
            label="Units"
            value={units === 'imperial' ? 'Imperial (lb)' : 'Metric (kg)'}
            iconBg={colors.warningMuted}
            onPress={() => { toggleUnits(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <SettingsRow
            icon={bellIcon}
            label="Notifications"
            isToggle
            toggleValue={notifications}
            onToggle={() => { toggleNotifications(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            iconBg={colors.warningMuted}
          />
          <SettingsRow
            icon={exportIcon}
            label="Export Data"
            iconBg={colors.elevated}
            onPress={handleExportData}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow
            icon={<View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />}
            label="Import Data"
            value="Strong, Hevy, CSV..."
            iconBg={colors.primaryMuted}
            onPress={() => router.push('/import-data' as any)}
          />
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
            icon={deleteIcon}
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
