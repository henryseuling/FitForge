import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useAppSync } from '@/hooks/useAppSync';

function TabIcon({ name, color }: { name: string; color: string }) {
  const active = color === colors.primary;

  switch (name) {
    case 'train':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          {active ? (
            <>
              <Path d="M3 8.5l8-5.5 8 5.5V18a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 18V8.5z" fill={color} />
              <Rect x={8} y={13} width={6} height={6.5} rx={1} fill={colors.bg} />
            </>
          ) : (
            <>
              <Path d="M3 8.5l8-5.5 8 5.5V18a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 18V8.5z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
              <Rect x={8} y={13} width={6} height={6.5} rx={1} stroke={color} strokeWidth={1.5} />
            </>
          )}
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          {active ? (
            <Path d="M4 16.5V6a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3.5z" fill={color} />
          ) : (
            <Path d="M4 16.5V6a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H8l-4 3.5z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
          )}
        </Svg>
      );
    case 'eat':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          {active ? (
            <>
              <Path d="M11 3C7 3 4 6 4 9c0 4 7 10 7 10s7-6 7-10c0-3-3-6-7-6z" fill={color} />
              <Circle cx={11} cy={9} r={2} fill={colors.bg} />
            </>
          ) : (
            <>
              <Path d="M11 3C7 3 4 6 4 9c0 4 7 10 7 10s7-6 7-10c0-3-3-6-7-6z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
              <Circle cx={11} cy={9} r={2} stroke={color} strokeWidth={1.5} />
            </>
          )}
        </Svg>
      );
    case 'progress':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path d="M4 16l3-6 3 4 3-8 3 5 2-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          {active && <Path d="M4 16l3-6 3 4 3-8 3 5 2-3V19H4z" fill={color + '26'} />}
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          {active ? (
            <>
              <Circle cx={11} cy={11} r={7} fill={color} />
              <Circle cx={11} cy={11} r={2.5} stroke={colors.bg} strokeWidth={1.8} />
            </>
          ) : (
            <>
              <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.5} />
              <Circle cx={11} cy={11} r={2.5} stroke={color} strokeWidth={1.5} />
            </>
          )}
        </Svg>
      );
    default:
      return null;
  }
}

export default function TabLayout() {
  useAppSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: 'rgba(255, 255, 255, 0.04)',
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: 28,
          height: 77,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans',
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          tabBarIcon: ({ color }) => <TabIcon name="train" color={color} />,
          tabBarAccessibilityLabel: 'Train tab - view workouts and start training',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon name="chat" color={color} />,
          tabBarAccessibilityLabel: 'Chat tab - talk to your AI coach',
        }}
      />
      <Tabs.Screen
        name="eat"
        options={{
          title: 'Eat',
          tabBarIcon: ({ color }) => <TabIcon name="eat" color={color} />,
          tabBarAccessibilityLabel: 'Eat tab - log meals and track nutrition',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabIcon name="progress" color={color} />,
          tabBarAccessibilityLabel: 'Progress tab - view stats and personal records',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
          tabBarAccessibilityLabel: 'Settings tab - manage your profile and preferences',
        }}
      />
    </Tabs>
  );
}
