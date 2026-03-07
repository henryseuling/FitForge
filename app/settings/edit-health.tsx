import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';

export default function EditHealthScreen() {
  const user = useUserStore();
  const [appleHealthLoading, setAppleHealthLoading] = useState(false);
  const [ouraRingLoading, setOuraRingLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const appleHealthConnected =
    user.integrations?.find((i) => i.name === 'Apple Health')?.connected ?? false;
  const ouraRingConnected =
    user.integrations?.find((i) => i.name === 'Oura Ring')?.connected ?? false;

  const handleAppleHealthConnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppleHealthLoading(true);

    // Simulate API call
    setTimeout(() => {
      Alert.alert(
        appleHealthConnected ? 'Disconnect Apple Health?' : 'Connect Apple Health?',
        appleHealthConnected
          ? 'Your health data will no longer sync from Apple Health.'
          : 'Allow FitForge to read and write health data from Apple Health. You can manage permissions in Settings.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setAppleHealthLoading(false) },
          {
            text: appleHealthConnected ? 'Disconnect' : 'Connect',
            style: appleHealthConnected ? 'destructive' : 'default',
            onPress: () => {
              // Update integrations
              const updated = user.integrations?.map((i) =>
                i.name === 'Apple Health'
                  ? { ...i, connected: !appleHealthConnected }
                  : i
              ) ?? [];

              useUserStore.getState().updateProfile({
                integrations: updated,
              });

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              setAppleHealthLoading(false);

              Alert.alert(
                'Success',
                appleHealthConnected
                  ? 'Apple Health disconnected.'
                  : 'Apple Health connected! Your health data will now sync.'
              );
            },
          },
        ]
      );
    }, 600);
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
    setSyncing(true);

    // Simulate sync
    setTimeout(() => {
      setSyncing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sync Complete', 'Health data has been synced successfully.');
    }, 2000);
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
                  Last synced: Just now
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
            Manually sync health data from connected devices
          </Text>
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
