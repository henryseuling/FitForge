import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';

export default function EditPersonalScreen() {
  const user = useUserStore();

  const [name, setName] = useState(user.name || '');
  const [age, setAge] = useState(user.age ? user.age.toString() : '');
  const [height, setHeight] = useState(user.height || '');
  const [weight, setWeight] = useState(user.weight ? user.weight.toString() : '');
  const [gender, setGender] = useState(user.gender || '');
  const [units, setUnits] = useState(user.units);

  const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const weightLabel = units === 'metric' ? 'kg' : 'lb';

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Name is required.');
      return;
    }

    const parsedWeight = parseFloat(weight) || 0;
    if (parsedWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    const parsedAge = parseInt(age) || 0;
    if (parsedAge < 13 || parsedAge > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age (13-120).');
      return;
    }

    useUserStore.getState().updateProfile({
      name: name.trim(),
      age: parsedAge,
      height: height.trim(),
      weight: parsedWeight,
      gender,
      units,
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

  function InputField({
    value,
    onChangeText,
    placeholder,
    keyboardType,
  }: {
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        accessibilityLabel={placeholder}
        style={{
          fontFamily: 'DMSans',
          fontSize: 15,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      />
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

  function UnitToggle() {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['imperial', 'metric'].map((unit) => {
          const label = unit === 'imperial' ? 'Imperial (lb)' : 'Metric (kg)';
          const isSelected = units === unit;
          return (
            <Pressable
              key={unit}
              onPress={() => {
                setUnits(unit as 'imperial' | 'metric');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 100,
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: isSelected ? 'DMSans-SemiBold' : 'DMSans',
                  fontSize: 12,
                  color: isSelected ? colors.bg : colors.textSecondary,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            accessibilityLabel="Cancel editing personal information"
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
            Personal Info
          </Text>
          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save personal information"
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              Basic Information
            </Text>
            <View style={{ gap: 6 }}>
              <FieldLabel text="Full Name" />
              <InputField
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
            </View>
          </View>

          {/* Age & Height */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              Physical Measurements
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Age" />
                <InputField
                  value={age}
                  onChangeText={setAge}
                  placeholder="28"
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Height" />
                <InputField
                  value={height}
                  onChangeText={setHeight}
                  placeholder={`5'8"`}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <FieldLabel text="Weight Units" />
              <UnitToggle />
            </View>

            <View style={{ gap: 6 }}>
              <FieldLabel text={`Weight (${weightLabel})`} />
              <InputField
                value={weight}
                onChangeText={setWeight}
                placeholder="155"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Gender */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: 'DMSans-SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              Demographics
            </Text>
            <View style={{ gap: 6 }}>
              <FieldLabel text="Gender" />
              <ChipRow
                options={GENDERS}
                selected={gender}
                onSelect={setGender}
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
              Current Values
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
                  Name:
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  {user.name || 'Not set'}
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
                  Age:
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  {user.age || 'Not set'}
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
                  Height:
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  {user.height || 'Not set'}
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
                  Weight:
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  {user.weight || 'Not set'} {user.weight ? weightLabel : ''}
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
                  Gender:
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans-SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                  }}
                >
                  {user.gender || 'Not set'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
