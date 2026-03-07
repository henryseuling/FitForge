import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { saveHealthSnapshot } from '@/lib/api';
import { useUserStore } from '@/stores/useUserStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';

export default function EditHealthScreen() {
  const user = useUserStore();
  const [appleHealthLoading, setAppleHealthLoading] = useState(false);
  const [ouraRingLoading, setOuraRingLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { readinessScore, hrv, restingHR, sleepScore, recoveryScore } = useWorkoutStore();

  const appleHealthConnected =
    user.integrations?.find((i) => i.name === 'Apple Health')?.connected ?? false;
  const ouraRingConnected =
    user.integrations?.find((i) => i.name === 'Oura Ring')?.connected ?? false;

  const handleAppleHealthConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Health unavailable', 'Apple Health integration is only available on iPhone.');
      return;
    }

    setAppleHealthLoading(true);
    try {
      if (appleHealthConnected) {
        const updated = user.integrations?.map((item) =>
          item.name === 'Apple Health' ? { ...item, connected: false } : item
        ) ?? [];
        useUserStore.getState().updateProfile({ integrations: updated });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Apple Health disconnected',
          'FitForge will stop using Apple Health data until you reconnect it. Existing data stays in your account.'
        );
        return;
      }

      const { initHealthKit, getReadinessScore } = require('@/lib/health');
      const initialized = await initHealthKit();
      if (!initialized) {
        Alert.alert(
          'Permission needed',
          'FitForge could not access Apple Health. Check iPhone Settings > Health > Data Access & Devices.'
        );
        return;
      }

      const readiness = await getReadinessScore();
      useWorkoutStore.getState().updateReadiness(readiness);
      await saveHealthSnapshot({
        readiness_score: readiness.score,
        hrv: readiness.hrv,
        resting_hr: readiness.restingHR,
        sleep_score: readiness.sleepScore,
        recovery_score: readiness.recoveryScore,
      });

      const updated = user.integrations?.map((item) =>
        item.name === 'Apple Health' ? { ...item, connected: true } : item
      ) ?? [];
      useUserStore.getState().updateProfile({ integrations: updated });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Apple Health connected',
        `Synced readiness ${readiness.score}/100 with HRV ${readiness.hrv} ms and sleep score ${readiness.sleepScore}/100.`
      );
    } catch (error) {
      console.warn('Apple Health connect failed:', error);
      Alert.alert(
        'Apple Health sync failed',
        'FitForge could not complete the HealthKit sync. Confirm permissions are granted and try again.'
      );
    } finally {
      setAppleHealthLoading(false);
    }
  };

  const handleOuraRingConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOuraRingLoading(true);

    setTimeout(() => {
      Alert.alert(
        ouraRingConnected ? 'Disconnect Oura Ring?' : 'Connect Oura Ring?',
        ouraRingConnected
          ? 'Your Oura Ring data will no longer sync with FitForge.'
          : "Connect your Oura Ring account to sync sleep, activity, and readiness data. You'll be redirected to Oura to authenticate.",
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setOuraRingLoading(false) },
          {
            text: ouraRingConnected ? 'Disconnect' : 'Connect',
            style: ouraRingConnected ? 'destructive' : 'default',
            onPress: () => {
              // Update integrations
              const updated = user.integrations?.map((i) =>
                i.name === 'Oura Ring'
                  ? { ...i, connected: !ouraRingConnected }
                  : i
              ) ?? [];

              useUserStore.getState().updateProfile({
                integrations: updated,
              });

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              setOuraRingLoading(false);

              Alert.alert(
                'Success',
                ouraRingConnected
                  ? 'Oura Ring disconnected.'
                  : 'Oura Ring connected! Sleep and activity data will sync automatically.'
              );
            },
          },
        ]
      );
    }, 600);
  };

  const handleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'ios') {
      Alert.alert('Health sync unavailable', 'Manual health sync is only available on iPhone.');
      return;
    }
    setSyncing(true);
    try {
      const { initHealthKit, getReadinessScore } = require('@/lib/health');
      const initialized = await initHealthKit();
      if (!initialized) {
        Alert.alert(
          'Permission needed',
          'FitForge could not access Apple Health. Check iPhone Settings > Health > Data Access & Devices.'
        );
        return;
      }

      const readiness = await getReadinessScore();
      useWorkoutStore.getState().updateReadiness(readiness);
      await saveHealthSnapshot({
        readiness_score: readiness.score,
        hrv: readiness.hrv,
        resting_hr: readiness.restingHR,
        sleep_score: readiness.sleepScore,
        recovery_score: readiness.recoveryScore,
      });

      const updated = user.integrations?.map((item) =>
        item.name === 'Apple Health' ? { ...item, connected: true } : item
      ) ?? [];
      useUserStore.getState().updateProfile({ integrations: updated });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Sync complete',
        `Readiness ${readiness.score}/100, HRV ${readiness.hrv} ms, resting HR ${readiness.restingHR} bpm.`
      );
    } catch (error) {
      console.warn('Apple Health manual sync failed:', error);
      Alert.alert('Sync failed', 'FitForge could not sync Apple Health right now.');
    } finally {
      setSyncing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  function FieldLabel({ text }: { text: string }) {
    return (
      <Text
        style={{
          fontFamily: 'DMSans-Medium',
          fontSize: 11,
          color: colors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
        }}
      >
        {text}
      </Text>
    );
  }

  function StatusBadge({ connected }: { connected: boolean }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 4,
          paddingHorizontal: 10,
          borderRadius: 100,
          backgroundColor: connected ? 'rgba(52, 211, 153, 0.12)' : 'rgba(82, 82, 107, 0.2)',
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: connected ? colors.success : colors.textTertiary,
          }}
        />
        <Text
          style={{
            fontFamily: 'DMSans-SemiBold',
            fontSize: 11,
            color: connected ? colors.success : colors.textTertiary,
          }}
        >
          {connected ? 'Connected' : 'Not Connected'}
        </Text>
      </View>
    );
  }

  function IntegrationCard({
    icon,
    title,
    description,
    connected,
    onConnect,
    loading,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    connected: boolean;
    onConnect: () => void;
    loading: boolean;
  }) {
    return (
      <View
        style={{
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <View style={{ padding: 14, gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: colors.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 15,
                    color: colors.textPrimary,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {description}
                </Text>
              </View>
            </View>
            <StatusBadge connected={connected} />
          </View>

          <Pressable
            onPress={onConnect}
            disabled={loading}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: connected ? colors.danger : colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              loading
                ? 'Connecting...'
                : connected
                  ? `Disconnect ${title}`
                  : `Connect ${title}`
            }
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={connected ? colors.bg : colors.bg} />
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: connected ? colors.textPrimary : colors.bg,
                  }}
                >
                  Connecting...
                </Text>
              </>
            ) : (
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: connected ? colors.textPrimary : colors.bg,
                }}
              >
                {connected ? 'Disconnect' : 'Connect'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  function InstructionRow({ step, text }: { step: string; text: string }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          <Text
            style={{
              fontFamily: 'JetBrainsMono-Bold',
              fontSize: 10,
              color: colors.primary,
            }}
          >
            {step}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: 'DMSans',
            fontSize: 12,
            lineHeight: 18,
            color: colors.textSecondary,
            flex: 1,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function AppleHealthSetupCard() {
    const troubleshooting = [
      Platform.OS !== 'ios'
        ? 'Apple Health only works on iPhone. iPad, Android, and web cannot connect to HealthKit.'
        : 'If no permission prompt appears, open the iPhone Health app, search for FitForge under Sharing > Apps, and allow Heart Rate Variability, Resting Heart Rate, Sleep, and Workouts.',
      'If the app says it synced but scores stay blank, make sure Apple Health actually has recent HRV, resting heart rate, and sleep data to read.',
      'After granting permissions, come back here and tap Sync Now so the coach can use the latest recovery context.',
    ];

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(232, 168, 56, 0.12)',
          gap: 12,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 15,
              color: colors.textPrimary,
            }}
          >
            How to connect Apple Health
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 12,
              lineHeight: 18,
              color: colors.textSecondary,
            }}
          >
            FitForge uses Apple Health to personalize readiness, recovery, and coach recommendations.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <InstructionRow step="1" text="Use FitForge on an iPhone build. Apple Health will not connect on Android, web, or unsupported simulator flows." />
          <InstructionRow step="2" text="Tap Connect on the Apple Health card below. iOS should show a Health permission sheet the first time." />
          <InstructionRow step="3" text="Allow FitForge to read Heart Rate Variability, Resting Heart Rate, Sleep, and Workouts so readiness can populate." />
          <InstructionRow step="4" text="Return to this screen and tap Sync Now. Once the sync succeeds, chat will use that recovery data in its advice." />
        </View>

        <View
          style={{
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.04)',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans-Medium',
              fontSize: 11,
              color: colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}
          >
            Troubleshooting
          </Text>
          {troubleshooting.map((item) => (
            <View
              key={item}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.textSecondary,
                  marginTop: 7,
                }}
              />
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 12,
                  lineHeight: 18,
                  color: colors.textSecondary,
                  flex: 1,
                }}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const appleHealthIcon = (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        fill={colors.danger}
      />
    </Svg>
  );

  const ouraRingIcon = (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={colors.danger} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4} stroke={colors.danger} strokeWidth={2} />
    </Svg>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Close health settings"
        >
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 15,
              color: colors.textSecondary,
            }}
          >
            Close
          </Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: 'DMSans-Bold',
            fontSize: 18,
            color: colors.textPrimary,
          }}
        >
          Health Integrations
        </Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Status */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Data Sync
          </Text>

          <Pressable
            onPress={handleSync}
            disabled={syncing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              opacity: syncing ? 0.7 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Sync health data"
            accessibilityState={{ disabled: syncing }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M1 4v6h6M23 20v-6h-6"
                    stroke={colors.success}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 03.51 15"
                    stroke={colors.success}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <View>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 15,
                    color: colors.textPrimary,
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 11,
                    color: colors.textTertiary,
                  }}
                >
                  Last synced: {appleHealthConnected ? 'Ready to use in chat' : 'Not connected'}
                </Text>
              </View>
            </View>

            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M4.5 2.5l4 3.5-4 3.5"
                stroke={colors.textTertiary}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 12,
              color: colors.textTertiary,
              marginTop: 4,
            }}
          >
            Pull current Apple Health recovery data into FitForge and the AI coach
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            gap: 10,
          }}
        >
          <FieldLabel text="Latest recovery metrics" />
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
              Readiness: <Text style={{ color: colors.textPrimary }}>{readinessScore || '--'}</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
              HRV: <Text style={{ color: colors.textPrimary }}>{hrv || '--'}</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
              Resting HR: <Text style={{ color: colors.textPrimary }}>{restingHR || '--'}</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
              Sleep score: <Text style={{ color: colors.textPrimary }}>{sleepScore || '--'}</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
              Recovery score: <Text style={{ color: colors.textPrimary }}>{recoveryScore || '--'}</Text>
            </Text>
          </View>
        </View>

        {/* Apple Health Integration */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Connected Services
          </Text>

          <AppleHealthSetupCard />

          <IntegrationCard
            icon={appleHealthIcon}
            title="Apple Health"
            description="Sync workouts, steps, and health metrics"
            connected={appleHealthConnected}
            onConnect={handleAppleHealthConnect}
            loading={appleHealthLoading}
          />

          {/* Oura Ring Integration */}
          <IntegrationCard
            icon={ouraRingIcon}
            title="Oura Ring"
            description="Track sleep, activity, and readiness"
            connected={ouraRingConnected}
            onConnect={handleOuraRingConnect}
            loading={ouraRingLoading}
          />
        </View>

        {/* Permissions Info */}
        <View
          style={{
            backgroundColor: colors.elevated,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 11,
              color: colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}
          >
            Permissions
          </Text>

          <View style={{ gap: 8 }}>
            <View style={{ gap: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.textSecondary,
                    marginTop: 6,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 12,
                    color: colors.textSecondary,
                    flex: 1,
                  }}
                >
                  FitForge requires permission to read health data from Apple Health
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.textSecondary,
                    marginTop: 6,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 12,
                    color: colors.textSecondary,
                    flex: 1,
                  }}
                >
                  You can manage permissions in Settings {'>'} Health {'>'} Data Access & Devices
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.textSecondary,
                    marginTop: 6,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 12,
                    color: colors.textSecondary,
                    flex: 1,
                  }}
                >
                  Disconnect integrations anytime to stop syncing data
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Oura Ring Info */}
        <View
          style={{
            backgroundColor: colors.elevated,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 11,
              color: colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}
          >
            About Oura Ring
          </Text>

          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 12,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            Oura Ring is a wearable device that tracks your sleep patterns, daily activity, and overall readiness. By connecting your Oura Ring account, FitForge can use this data to optimize your training recommendations and recovery strategies.
          </Text>

          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 12,
              color: colors.textTertiary,
              marginTop: 4,
            }}
          >
            You need an Oura Ring account to use this integration.
          </Text>
        </View>

        {/* Integration Status Summary */}
        <View
          style={{
            backgroundColor: colors.elevated,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.04)',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 11,
              color: colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}
          >
            Connection Status
          </Text>

          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Apple Health:
              </Text>
              <View
                style={{
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: appleHealthConnected
                    ? 'rgba(52, 211, 153, 0.12)'
                    : 'rgba(82, 82, 107, 0.2)',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 11,
                    color: appleHealthConnected ? colors.success : colors.textTertiary,
                  }}
                >
                  {appleHealthConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Oura Ring:
              </Text>
              <View
                style={{
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: ouraRingConnected
                    ? 'rgba(52, 211, 153, 0.12)'
                    : 'rgba(82, 82, 107, 0.2)',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 11,
                    color: ouraRingConnected ? colors.success : colors.textTertiary,
                  }}
                >
                  {ouraRingConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
