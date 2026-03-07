import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';

export default function EditScheduleScreen() {
  const user = useUserStore();

  const [frequency, setFrequency] = useState(user.frequency || 4);
  const [sessionDuration, setSessionDuration] = useState(user.sessionDuration || 60);
  const [equipment, setEquipment] = useState<string[]>(user.equipment || []);

  const EQUIPMENT_OPTIONS = [
    { id: 'barbell', label: 'Barbell' },
    { id: 'dumbbell', label: 'Dumbbell' },
    { id: 'kettlebell', label: 'Kettlebell' },
    { id: 'machine', label: 'Machine' },
    { id: 'cable', label: 'Cable' },
    { id: 'resistance-band', label: 'Resistance Band' },
    { id: 'bodyweight', label: 'Bodyweight' },
    { id: 'cardio', label: 'Cardio Equipment' },
  ];

  const handleSave = () => {
    if (frequency < 2 || frequency > 7) {
      Alert.alert('Invalid Frequency', 'Please select 2-7 days per week.');
      return;
    }

    useUserStore.getState().updateProfile({
      frequency,
      equipment,
      sessionDuration,
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

  function StepperButton({
    value,
    onPress,
    disabled,
  }: {
    value: number;
    onPress: () => void;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        onPress={() => {
          onPress();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        disabled={disabled}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: disabled ? colors.elevated : colors.surface,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel={`${value} days`}
      >
        <Text
          style={{
            fontFamily: 'DMSans-SemiBold',
            fontSize: 16,
            color: colors.textPrimary,
          }}
        >
          {value < 0 ? '−' : '+'}
        </Text>
      </Pressable>
    );
  }

  function EquipmentCheckbox({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={() => {
          onPress();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.primary : 'rgba(255,255,255,0.06)',
          gap: 10,
        }}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: selected ? colors.primary : colors.elevated,
            borderWidth: 1,
            borderColor: selected ? colors.primary : 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
              <Path
                d="M2 6l3 3 5-5"
                stroke={colors.bg}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
        <Text
          style={{
            fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans',
            fontSize: 13,
            color: selected ? colors.bg : colors.textPrimary,
          }}
        >
          {label}
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
          accessibilityLabel="Cancel editing schedule"
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
          Schedule & Equipment
        </Text>
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save schedule and equipment"
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
        {/* Training Frequency */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Training Frequency
          </Text>

          <View style={{ gap: 6 }}>
            <FieldLabel text="Days Per Week" />
            <View
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
              }}
            >
              <StepperButton
                value={-1}
                onPress={() => setFrequency(Math.max(2, frequency - 1))}
                disabled={frequency <= 2}
              />

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans-Bold',
                    fontSize: 28,
                    color: colors.primary,
                  }}
                >
                  {frequency}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 11,
                    color: colors.textTertiary,
                  }}
                >
                  {frequency === 1 ? 'day' : 'days'}
                </Text>
              </View>

              <StepperButton
                value={1}
                onPress={() => setFrequency(Math.min(7, frequency + 1))}
                disabled={frequency >= 7}
              />
            </View>

            <Text
              style={{
                fontFamily: 'DMSans',
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              How many days per week do you plan to train?
            </Text>
          </View>
        </View>

        {/* Training Duration */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Session Duration
          </Text>

          <View style={{ gap: 6 }}>
            <FieldLabel text="Typical Session Length" />
            <View
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    height: 6,
                    flex: 1,
                    borderRadius: 3,
                    backgroundColor: colors.elevated,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${((sessionDuration - 30) / 60) * 100}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.primary,
                    minWidth: 30,
                  }}
                >
                  {sessionDuration}m
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[30, 45, 60, 75, 90].map((duration) => (
                <Pressable
                  key={duration}
                  onPress={() => {
                    setSessionDuration(duration);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      sessionDuration === duration ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor:
                      sessionDuration === duration
                        ? colors.primary
                        : 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${duration} minute session`}
                  accessibilityState={{ selected: sessionDuration === duration }}
                >
                  <Text
                    style={{
                      fontFamily:
                        sessionDuration === duration
                          ? 'DMSans-SemiBold'
                          : 'DMSans',
                      fontSize: 12,
                      color:
                        sessionDuration === duration
                          ? colors.bg
                          : colors.textSecondary,
                    }}
                  >
                    {duration}m
                  </Text>
                </Pressable>
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
              Average length of your training sessions
            </Text>
          </View>
        </View>

        {/* Equipment Available */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 16,
              color: colors.textPrimary,
            }}
          >
            Available Equipment
          </Text>

          <View style={{ gap: 6 }}>
            <FieldLabel text="Select All That Apply" />
            <View style={{ gap: 8 }}>
              {EQUIPMENT_OPTIONS.map((item) => (
                <EquipmentCheckbox
                  key={item.id}
                  label={item.label}
                  selected={equipment.includes(item.id)}
                  onPress={() => {
                    if (equipment.includes(item.id)) {
                      setEquipment(
                        equipment.filter((e) => e !== item.id)
                      );
                    } else {
                      setEquipment([...equipment, item.id]);
                    }
                  }}
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
              {equipment.length === 0
                ? 'Select at least one equipment type'
                : `${equipment.length} equipment type${
                    equipment.length === 1 ? '' : 's'
                  } selected`}
            </Text>
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
                Training Frequency:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              >
                {user.frequency || 'Not set'} {user.frequency === 1 ? 'day' : 'days'}
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
                Equipment:
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                  textAlign: 'right',
                  flex: 1,
                  marginLeft: 8,
                }}
              >
                {user.equipment && user.equipment.length > 0
                  ? user.equipment.length === 1
                    ? '1 type'
                    : `${user.equipment.length} types`
                  : 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Frequency Grid */}
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
            Weekly Calendar Preview
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
              (day, idx) => {
                const isTrainingDay = idx < frequency || (frequency === 7);
                return (
                  <View
                    key={day}
                    style={{
                      flex: 1,
                      gap: 4,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans',
                        fontSize: 10,
                        color: colors.textTertiary,
                      }}
                    >
                      {day}
                    </Text>
                    <View
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 8,
                        backgroundColor: isTrainingDay
                          ? colors.primary
                          : colors.surface,
                        borderWidth: 1,
                        borderColor: isTrainingDay
                          ? colors.primary
                          : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  </View>
                );
              }
            )}
          </View>
          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 11,
              color: colors.textTertiary,
              marginTop: 4,
            }}
          >
            {frequency} training days per week
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
