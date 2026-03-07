import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';

export default function EditTrainingScreen() {
  const user = useUserStore();

  const [level, setLevel] = useState(user.level || 'Beginner');
  const [split, setSplit] = useState(user.trainingSplit || '3-Day Full Body');
  const [restTimer, setRestTimer] = useState(user.restTimerDuration);
  const [progressiveOverload, setProgressiveOverload] = useState(
    user.progressiveOverload
  );

  const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
  const SPLITS = ['3-Day Full Body', '4-Day Upper/Lower', '5-Day Rotation', '6-Day PPL'];
  const REST_TIMER_OPTIONS = [60, 90, 120, 150, 180];

  const deriveFrequency = (trainingSplit: string) => {
    switch (trainingSplit) {
      case '3-Day Full Body':
        return 3;
      case '4-Day Upper/Lower':
        return 4;
      case '5-Day Rotation':
        return 5;
      case '6-Day PPL':
        return 6;
      default:
        return undefined;
    }
  };

  const handleSave = () => {
    useUserStore.getState().updateProfile({
      level,
      trainingSplit: split,
      frequency: deriveFrequency(split),
      restTimerDuration: restTimer,
      progressiveOverload,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  function ChipRow({
    options,
    selected,
    onSelect,
  }: {
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
  }) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => {
              onSelect(opt);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            accessibilityRole="radio"
            accessibilityLabel={opt}
            accessibilityState={{ selected: selected === opt }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 100,
              backgroundColor:
                selected === opt ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor:
                selected === opt ? colors.primary : 'rgba(255,255,255,0.06)',
            }}
          >
            <Text
              style={{
                fontFamily: selected === opt ? 'DMSans-SemiBold' : 'DMSans',
                fontSize: 13,
                color: selected === opt ? colors.bg : colors.textSecondary,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function RestTimerButton({ value, isSelected, onPress }: { value: number; isSelected: boolean; onPress: () => void }) {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs === 0 ? `${mins}m` : `${mins}m${secs}s`;
    };

    return (
      <Pressable
        onPress={() => {
          onPress();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        accessibilityRole="radio"
        accessibilityLabel={`${formatTime(value)} rest timer`}
        accessibilityState={{ selected: isSelected }}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 100,
          backgroundColor: isSelected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: isSelected ? colors.primary : 'rgba(255,255,255,0.06)',
        }}
      >
        <Text
          style={{
            fontFamily: isSelected ? 'DMSans-SemiBold' : 'DMSans',
            fontSize: 12,
            color: isSelected ? colors.bg : colors.textSecondary,
          }}
        >
          {formatTime(value)}
        </Text>
      </Pressable>
    );
  }

  function SettingRow({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans-Medium',
            fontSize: 15,
            color: colors.textPrimary,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans',
            fontSize: 13,
            color: colors.textSecondary,
          }}
        >
          {value}
        </Text>
      </Pressable>
    );
  }

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
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing training settings"
        >
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 15,
              color: colors.textSecondary,
            }}
          >
            Cancel
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
          Training Settings
        </Text>
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save training settings"
        >
          <Text
            style={{
              fontFamily: 'DMSans-Bold',
              fontSize: 15,
              color: colors.primary,
            }}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Experience Level */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Experience
          </Text>
          <View style={{ gap: 6 }}>
            <FieldLabel text="Your Level" />
            <ChipRow
              options={LEVELS}
              selected={level}
              onSelect={setLevel}
            />
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              {level === 'Beginner' && 'Less than 1 year of structured training'}
              {level === 'Intermediate' && '1-3 years of consistent training'}
              {level === 'Advanced' && '3+ years of serious training experience'}
            </Text>
          </View>
        </View>

        {/* Training Split */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Program Design
          </Text>
          <View style={{ gap: 6 }}>
            <FieldLabel text="Training Split" />
            <ChipRow
              options={SPLITS}
              selected={split}
              onSelect={setSplit}
            />
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              {split === '3-Day Full Body' && 'Balanced full-body workouts'}
              {split === '4-Day Upper/Lower' && 'Upper body and lower body splits'}
              {split === '5-Day Rotation' && 'Muscle group rotation split'}
              {split === '6-Day PPL' && 'Push/Pull/Legs program'}
            </Text>
          </View>
        </View>

        {/* Rest Timer */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Recovery
          </Text>
          <View style={{ gap: 6 }}>
            <FieldLabel text="Default Rest Timer" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {REST_TIMER_OPTIONS.map((option) => (
                <RestTimerButton
                  key={option}
                  value={option}
                  isSelected={restTimer === option}
                  onPress={() => setRestTimer(option)}
                />
              ))}
            </View>
            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              Default rest duration between sets during workouts
            </Text>
          </View>
        </View>

        {/* Progressive Overload */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Progress Tracking
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  fontFamily: 'DMSans-Medium',
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              >
                Progressive Overload
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 11,
                  color: colors.textTertiary,
                }}
              >
                Track weight/rep increases over time
              </Text>
            </View>
            <Switch
              value={progressiveOverload}
              onValueChange={() => {
                setProgressiveOverload(!progressiveOverload);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: colors.elevated, true: colors.primary }}
              thumbColor="white"
              accessibilityRole="switch"
              accessibilityLabel="Progressive overload tracking"
              accessibilityState={{ checked: progressiveOverload }}
            />
          </View>
        </View>

        {/* Current Values Summary */}
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
            Current Settings
          </Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Experience:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              >
                {user.level || 'Not set'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Split:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              >
                {user.trainingSplit || 'Not set'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Rest Timer:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              >
                {Math.floor(user.restTimerDuration / 60)}m
                {user.restTimerDuration % 60 > 0 ? user.restTimerDuration % 60 + 's' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Progressive Overload:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              >
                {user.progressiveOverload ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
