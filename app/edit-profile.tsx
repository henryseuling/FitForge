import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useNutritionStore } from '@/stores/useNutritionStore';

export default function EditProfileScreen() {
  const user = useUserStore();
  const nutrition = useNutritionStore();

  const [name, setName] = useState(user.name);
  const [height, setHeight] = useState(user.height);
  const [weight, setWeight] = useState(user.weight ? user.weight.toString() : '');
  const [age, setAge] = useState(user.age ? user.age.toString() : '');
  const [gender, setGender] = useState(user.gender);
  const [level, setLevel] = useState(user.level);
  const [split, setSplit] = useState(user.trainingSplit);
  const [calories, setCalories] = useState(nutrition.calorieTarget.toString());
  const [protein, setProtein] = useState(nutrition.proteinTarget.toString());

  const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
  const SPLITS = ['3-Day Full Body', '4-Day Upper/Lower', '5-Day Rotation', '6-Day PPL'];
  const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Missing Info', 'Name is required.'); return; }
    useUserStore.getState().updateProfile({
      name: name.trim(),
      height,
      weight: parseFloat(weight) || 0,
      age: parseInt(age) || 0,
      gender,
      level,
      trainingSplit: split,
    });
    const cals = parseInt(calories) || 2000;
    const prot = parseInt(protein) || 150;
    const proteinCals = prot * 4;
    const remainingCals = cals - proteinCals;
    const carbsTarget = Math.round((remainingCals * 0.55) / 4);
    const fatTarget = Math.round((remainingCals * 0.45) / 9);
    useNutritionStore.getState().updateTargets({
      calorieTarget: cals,
      proteinTarget: prot,
      carbsTarget,
      fatTarget,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  function FieldLabel({ text }: { text: string }) {
    return <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>{text}</Text>;
  }

  function InputField({ value, onChangeText, placeholder, keyboardType }: {
    value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        style={{
          fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
          backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        }}
      />
    );
  }

  function ChipRow({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => { onSelect(opt); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100,
              backgroundColor: selected === opt ? colors.primary : colors.surface,
              borderWidth: 1, borderColor: selected === opt ? colors.primary : 'rgba(255,255,255,0.06)',
            }}
          >
            <Text style={{
              fontFamily: selected === opt ? 'DMSans-SemiBold' : 'DMSans',
              fontSize: 13, color: selected === opt ? colors.bg : colors.textSecondary,
            }}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.textPrimary }}>Edit Profile</Text>
          <Pressable onPress={handleSave}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.primary }}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Personal */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Personal</Text>
            <View style={{ gap: 6 }}>
              <FieldLabel text="Name" />
              <InputField value={name} onChangeText={setName} placeholder="Your name" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Height" />
                <InputField value={height} onChangeText={setHeight} placeholder="5'8&quot;" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Weight (lbs)" />
                <InputField value={weight} onChangeText={setWeight} placeholder="155" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Age" />
                <InputField value={age} onChangeText={setAge} placeholder="28" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Gender" />
                <ChipRow options={GENDERS} selected={gender} onSelect={setGender} />
              </View>
            </View>
          </View>

          {/* Training */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Training</Text>
            <View style={{ gap: 6 }}>
              <FieldLabel text="Experience Level" />
              <ChipRow options={LEVELS} selected={level} onSelect={setLevel} />
            </View>
            <View style={{ gap: 6 }}>
              <FieldLabel text="Training Split" />
              <ChipRow options={SPLITS} selected={split} onSelect={setSplit} />
            </View>
          </View>

          {/* Nutrition */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Nutrition</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Daily Calories" />
                <InputField value={calories} onChangeText={setCalories} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <FieldLabel text="Daily Protein (g)" />
                <InputField value={protein} onChangeText={setProtein} keyboardType="number-pad" />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
