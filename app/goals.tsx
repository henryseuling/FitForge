import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/lib/theme';
import { useUserStore } from '@/stores/useUserStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { supabase } from '@/lib/supabase';
import { fetchActiveGoals, createGoal as apiCreateGoal, deleteGoal as apiDeleteGoal } from '@/lib/api';
import { evaluateAndUpdateGoals, resetEvalCooldown, type GoalHorizon } from '@/lib/goalEngine';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Goal {
  id: string;
  type: 'weight' | 'strength' | 'frequency' | 'nutrition' | 'habit';
  title: string;
  current: number;
  target: number;
  unit: string;
  deadline?: string;
  horizon: GoalHorizon;
  auto: boolean;
}

type GoalType = Goal['type'];

const GOAL_TYPE_META: Record<GoalType, { label: string; color: string; mutedColor: string }> = {
  weight: { label: 'Weight', color: colors.primary, mutedColor: colors.primaryMuted },
  strength: { label: 'Strength', color: '#818CF8', mutedColor: 'rgba(129, 140, 248, 0.12)' },
  frequency: { label: 'Frequency', color: colors.success, mutedColor: colors.successMuted },
  nutrition: { label: 'Nutrition', color: colors.warning, mutedColor: 'rgba(251, 191, 36, 0.12)' },
  habit: { label: 'Habit', color: '#A78BFA', mutedColor: 'rgba(167, 139, 250, 0.12)' },
};

const HORIZON_LABELS: Record<GoalHorizon, string> = {
  short: 'This Week',
  medium: 'This Month',
  long: 'This Year',
};

const LIFT_OPTIONS = ['Bench Press', 'Squat', 'Deadlift', 'OHP'] as const;

// ---------------------------------------------------------------------------
// Icons (inline SVGs)
// ---------------------------------------------------------------------------

function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ScaleIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3V21M3 12H21M7 8L12 3L17 8M7 16L12 21L17 16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DumbbellIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5H4a1 1 0 00-1 1v9a1 1 0 001 1h2.5M17.5 6.5H20a1 1 0 011 1v9a1 1 0 01-1 1h-2.5M6.5 4.5a1 1 0 011-1h1a1 1 0 011 1v15a1 1 0 01-1 1h-1a1 1 0 01-1-1v-15zM14.5 4.5a1 1 0 011-1h1a1 1 0 011 1v15a1 1 0 01-1 1h-1a1 1 0 01-1-1v-15zM9.5 12h5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1.5} fill={color} />
    </Svg>
  );
}

function FlameIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c4.97 0 7-3.58 7-7 0-3-2-5.5-3-7-.36-.54-1-.54-1.36 0-.53.8-1.14 1.88-1.64 2.75-.15.26-.53.26-.64-.02C11.5 8.5 11 6 11 4c0-.55-.45-1-.96-.76C6.83 4.76 5 8.5 5 15c0 3.42 2.03 7 7 7z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RepeatIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M17 1L21 5L17 9M3 11V9A4 4 0 017 5H21M7 23L3 19L7 15M21 13V15A4 4 0 0117 19H3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={colors.bg} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6H21M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6V20a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke={colors.danger} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DismissIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13L9 17L19 7" stroke={colors.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GoalIcon({ type, color }: { type: GoalType; color: string }) {
  switch (type) {
    case 'weight': return <ScaleIcon color={color} />;
    case 'strength': return <DumbbellIcon color={color} />;
    case 'frequency': return <CalendarIcon color={color} />;
    case 'nutrition': return <FlameIcon color={color} />;
    case 'habit': return <RepeatIcon color={color} />;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getProgressPercent(current: number, target: number, type: GoalType): number {
  if (target === 0) return 0;
  if (type === 'weight' && target < current) {
    const diff = current - target;
    if (diff <= 0) return 100;
    return Math.max(0, Math.min(100, (1 - diff / current) * 100));
  }
  return Math.max(0, Math.min(100, (current / target) * 100));
}

function mapGoalFromDb(g: any): Goal {
  return {
    id: g.id,
    type: g.type || 'frequency',
    title: g.title || '',
    current: g.current_value || 0,
    target: g.target_value || 0,
    unit: g.unit || '',
    deadline: g.deadline || undefined,
    horizon: g.horizon || 'medium',
    auto: g.auto || false,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GoalCard({
  goal,
  onDelete,
  onDismiss,
}: {
  goal: Goal;
  onDelete: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const meta = GOAL_TYPE_META[goal.type] || GOAL_TYPE_META.frequency;
  const progress = getProgressPercent(goal.current, goal.target, goal.type);
  const isComplete = progress >= 100;

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isComplete ? 'rgba(52, 211, 153, 0.2)' : colors.borderLight,
      padding: 16,
      gap: 14,
    }}>
      {/* Top row: icon + title + badges + action */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: meta.mutedColor,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <GoalIcon type={goal.type} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary, flexShrink: 1 }} numberOfLines={1}>
              {goal.title}
            </Text>
            {goal.auto && (
              <View style={{
                backgroundColor: 'rgba(167, 139, 250, 0.12)',
                borderRadius: 100,
                paddingHorizontal: 7, paddingVertical: 1,
              }}>
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: '#A78BFA' }}>Auto</Text>
              </View>
            )}
          </View>
          {goal.deadline ? (
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
              Target: {goal.deadline}
            </Text>
          ) : null}
        </View>
        {isComplete ? (
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: colors.successMuted,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckIcon />
          </View>
        ) : goal.auto ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDismiss(goal.id);
            }}
            hitSlop={8}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <DismissIcon />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDelete(goal.id);
            }}
            hitSlop={8}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(248, 113, 113, 0.08)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <TrashIcon />
          </Pressable>
        )}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary }}>
          {goal.current.toLocaleString()}
        </Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>
          / {goal.target.toLocaleString()} {goal.unit}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ gap: 6 }}>
        <View style={{
          height: 6, borderRadius: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${Math.min(progress, 100)}%` as any,
            borderRadius: 3,
            backgroundColor: isComplete ? colors.success : meta.color,
          }} />
        </View>
        <Text style={{
          fontFamily: 'DMSans-Medium', fontSize: 11,
          color: isComplete ? colors.success : colors.textTertiary,
          textAlign: 'right',
        }}>
          {isComplete ? 'Goal reached!' : `${Math.round(progress)}%`}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Goal Form
// ---------------------------------------------------------------------------

function AddGoalForm({ onSave, onCancel }: { onSave: (goal: Goal) => void; onCancel: () => void }) {
  const user = useUserStore();
  const progress = useProgressStore();
  const nutrition = useNutritionStore();

  const [goalType, setGoalType] = useState<GoalType>('weight');
  const [horizon, setHorizon] = useState<GoalHorizon>('medium');
  const [targetValue, setTargetValue] = useState('');
  const [selectedLift, setSelectedLift] = useState<typeof LIFT_OPTIONS[number]>('Bench Press');
  const [deadline, setDeadline] = useState('');

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let goal: Goal;
    const id = generateId();
    const base = { horizon, auto: false };

    switch (goalType) {
      case 'weight':
        goal = {
          id, type: 'weight', ...base,
          title: 'Weight Target',
          current: progress.weight || user.weight || 0,
          target: parseFloat(targetValue) || 0,
          unit: 'lbs',
          deadline: deadline || undefined,
        };
        break;
      case 'strength': {
        const existingLift = progress.keyLifts.find((l) => l.name === selectedLift);
        goal = {
          id, type: 'strength', ...base,
          title: `${selectedLift} PR`,
          current: existingLift?.weight || 0,
          target: parseFloat(targetValue) || 0,
          unit: 'lbs',
          deadline: deadline || undefined,
        };
        break;
      }
      case 'frequency':
        goal = {
          id, type: 'frequency', ...base,
          title: 'Weekly Workouts',
          current: progress.streak || 0,
          target: parseInt(targetValue) || 0,
          unit: 'days/wk',
          deadline: deadline || undefined,
        };
        break;
      case 'nutrition':
        goal = {
          id, type: 'nutrition', ...base,
          title: 'Daily Calories',
          current: nutrition.totalCalories(),
          target: parseInt(targetValue) || 0,
          unit: 'kcal',
          deadline: deadline || undefined,
        };
        break;
      case 'habit':
        goal = {
          id, type: 'habit', ...base,
          title: targetValue || 'Build consistency',
          current: 0,
          target: 7,
          unit: 'days',
          deadline: deadline || undefined,
        };
        break;
    }

    onSave(goal);
  };

  const typeOptions: GoalType[] = ['weight', 'strength', 'frequency', 'nutrition', 'habit'];

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 20,
      gap: 20,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 17, color: colors.textPrimary }}>
          New Goal
        </Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textTertiary }}>Cancel</Text>
        </Pressable>
      </View>

      {/* Horizon selector */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          Timeframe
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['short', 'medium', 'long'] as GoalHorizon[]).map((h) => {
            const selected = horizon === h;
            return (
              <Pressable
                key={h}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHorizon(h);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: selected ? colors.primaryMuted : colors.elevated,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary + '40' : 'transparent',
                }}
              >
                <Text style={{
                  fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans',
                  fontSize: 13,
                  color: selected ? colors.primary : colors.textSecondary,
                }}>
                  {HORIZON_LABELS[h]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Goal type selector */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          Goal Type
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {typeOptions.map((type) => {
            const meta = GOAL_TYPE_META[type];
            const selected = goalType === type;
            return (
              <Pressable
                key={type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGoalType(type);
                  setTargetValue('');
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 8, paddingHorizontal: 14,
                  borderRadius: 100,
                  backgroundColor: selected ? meta.mutedColor : colors.elevated,
                  borderWidth: 1,
                  borderColor: selected ? meta.color + '40' : 'transparent',
                }}
              >
                <GoalIcon type={type} color={selected ? meta.color : colors.textTertiary} />
                <Text style={{
                  fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans',
                  fontSize: 13,
                  color: selected ? meta.color : colors.textSecondary,
                }}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Type-specific inputs */}
      {goalType === 'weight' && (
        <View style={{ gap: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.elevated, borderRadius: radius.md, padding: 14,
          }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>Current Weight</Text>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary }}>
              {progress.weight || user.weight || '--'} lbs
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Target Weight (lbs)
            </Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. 175"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              style={{
                fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary,
                backgroundColor: colors.elevated, borderRadius: radius.md,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            />
          </View>
        </View>
      )}

      {goalType === 'strength' && (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Lift
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {LIFT_OPTIONS.map((lift) => {
                const selected = selectedLift === lift;
                const existingLift = progress.keyLifts.find((l) => l.name === lift);
                return (
                  <Pressable
                    key={lift}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedLift(lift);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10, paddingHorizontal: 6,
                      borderRadius: radius.md, alignItems: 'center', gap: 2,
                      backgroundColor: selected ? 'rgba(129, 140, 248, 0.12)' : colors.elevated,
                      borderWidth: 1,
                      borderColor: selected ? 'rgba(129, 140, 248, 0.3)' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontFamily: selected ? 'DMSans-SemiBold' : 'DMSans',
                      fontSize: 11, color: selected ? '#818CF8' : colors.textSecondary,
                      textAlign: 'center',
                    }}>
                      {lift}
                    </Text>
                    {existingLift ? (
                      <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 10, color: colors.textTertiary }}>
                        {existingLift.weight} lbs
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Target Weight (lbs)
            </Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. 315"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              style={{
                fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary,
                backgroundColor: colors.elevated, borderRadius: radius.md,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            />
          </View>
        </View>
      )}

      {goalType === 'frequency' && (
        <View style={{ gap: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.elevated, borderRadius: radius.md, padding: 14,
          }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>Current Streak</Text>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary }}>
              {progress.streak || 0} days
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Workouts Per Week
            </Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. 5"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              style={{
                fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary,
                backgroundColor: colors.elevated, borderRadius: radius.md,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            />
          </View>
        </View>
      )}

      {goalType === 'nutrition' && (
        <View style={{ gap: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.elevated, borderRadius: radius.md, padding: 14,
          }}>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>Today's Intake</Text>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary }}>
              {nutrition.totalCalories().toLocaleString()} kcal
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Daily Calorie Target
            </Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. 2500"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              style={{
                fontFamily: 'JetBrainsMono-Bold', fontSize: 15, color: colors.textPrimary,
                backgroundColor: colors.elevated, borderRadius: radius.md,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            />
          </View>
        </View>
      )}

      {goalType === 'habit' && (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
              Habit Description
            </Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g. Log meals every day"
              placeholderTextColor={colors.textTertiary}
              style={{
                fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
                backgroundColor: colors.elevated, borderRadius: radius.md,
                paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1, borderColor: colors.borderLight,
              }}
            />
          </View>
        </View>
      )}

      {/* Deadline */}
      {goalType !== 'habit' && (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
            Target Date (optional)
          </Text>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="e.g. March 2026"
            placeholderTextColor={colors.textTertiary}
            style={{
              fontFamily: 'DMSans', fontSize: 15, color: colors.textPrimary,
              backgroundColor: colors.elevated, borderRadius: radius.md,
              paddingHorizontal: 16, paddingVertical: 14,
              borderWidth: 1, borderColor: colors.borderLight,
            }}
          />
        </View>
      )}

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={!targetValue}
        style={({ pressed }) => ({
          backgroundColor: targetValue ? colors.primary : colors.elevated,
          borderRadius: radius.md,
          paddingVertical: 16,
          alignItems: 'center', justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{
          fontFamily: 'DMSans-Bold', fontSize: 15,
          color: targetValue ? colors.bg : colors.textTertiary,
        }}>
          Save Goal
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 48, gap: 16,
    }}>
      <View style={{
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 17, color: colors.textPrimary }}>
          No goals yet
        </Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary, textAlign: 'center', maxWidth: 260 }}>
          Set targets for weight, strength, workout frequency, or nutrition to track your progress.
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load goals + run goal engine on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Run goal engine first (creates auto-goals if needed, updates progress)
        await evaluateAndUpdateGoals().catch(() => {});

        // Then fetch the latest state
        const data = await fetchActiveGoals();
        if (!cancelled && data) {
          setGoals(data.map(mapGoalFromDb));
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAddGoal = useCallback(async (goal: Goal) => {
    setShowForm(false);
    try {
      const created = await apiCreateGoal({
        type: goal.type,
        title: goal.title,
        target_value: goal.target,
        current_value: goal.current,
        unit: goal.unit,
        deadline: goal.deadline || undefined,
        horizon: goal.horizon,
        auto: false,
      });
      setGoals((prev) => [
        ...prev,
        { ...goal, id: created.id },
      ]);
    } catch {}
  }, []);

  const handleDeleteGoal = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await apiDeleteGoal(id);
    } catch {}
  }, []);

  const handleDismissGoal = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await apiDeleteGoal(id);
      // Force re-evaluation to generate a replacement
      resetEvalCooldown();
      const result = await evaluateAndUpdateGoals();
      if (result) {
        setGoals(result.map(mapGoalFromDb));
      }
    } catch {}
  }, []);

  const completedCount = goals.filter((g) => getProgressPercent(g.current, g.target, g.type) >= 100).length;

  // Group by horizon
  const goalsByHorizon = (['short', 'medium', 'long'] as GoalHorizon[]).map((h) => ({
    horizon: h,
    label: HORIZON_LABELS[h],
    goals: goals.filter((g) => g.horizon === h),
  })).filter((group) => group.goals.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
          gap: 16,
        }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={8}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.borderLight,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BackArrow />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 22, color: colors.textPrimary }}>
              Goals
            </Text>
          </View>
          {goals.length > 0 && (
            <View style={{
              backgroundColor: colors.primaryMuted,
              borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.primary }}>
                {completedCount}/{goals.length}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary banner (when goals exist) */}
          {goals.length > 0 && (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.borderSubtle,
              padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 16,
            }}>
              {/* Circular progress indicator */}
              <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={52} height={52} viewBox="0 0 52 52">
                  <Circle
                    cx={26} cy={26} r={22}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={4}
                    fill="none"
                  />
                  <Circle
                    cx={26} cy={26} r={22}
                    stroke={colors.primary}
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(completedCount / goals.length) * 138.2} 138.2`}
                    transform="rotate(-90 26 26)"
                  />
                </Svg>
                <Text style={{
                  position: 'absolute',
                  fontFamily: 'JetBrainsMono-Bold', fontSize: 14, color: colors.textPrimary,
                }}>
                  {Math.round((completedCount / goals.length) * 100)}%
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary }}>
                  {completedCount === goals.length
                    ? 'All goals reached!'
                    : `${goals.length - completedCount} goal${goals.length - completedCount !== 1 ? 's' : ''} in progress`
                  }
                </Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>
                  {completedCount} of {goals.length} completed
                </Text>
              </View>
            </View>
          )}

          {/* Goals grouped by horizon */}
          {goalsByHorizon.map(({ horizon, label, goals: horizonGoals }) => (
            <View key={horizon} style={{ gap: 10 }}>
              <Text style={{
                fontFamily: 'DMSans-Medium', fontSize: 11,
                color: colors.textTertiary,
                textTransform: 'uppercase', letterSpacing: 0.7,
                paddingLeft: 4,
              }}>
                {label}
              </Text>
              {horizonGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} onDismiss={handleDismissGoal} />
              ))}
            </View>
          ))}

          {/* Empty state */}
          {goals.length === 0 && !showForm && !loading && <EmptyState />}

          {/* Add Goal form */}
          {showForm && (
            <AddGoalForm onSave={handleAddGoal} onCancel={() => setShowForm(false)} />
          )}

          {/* Add Goal button */}
          {!showForm && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowForm(true);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: 16,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <PlusIcon />
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.bg }}>
                Add Goal
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
