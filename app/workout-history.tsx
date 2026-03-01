import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Svg, { Path } from 'react-native-svg';

type CompletedSet = {
  id: string;
  weight: number | null;
  reps: number | null;
};

type Exercise = {
  id: string;
  name: string;
  completed_sets: CompletedSet[];
};

type Workout = {
  id: string;
  name: string;
  started_at: string;
  finished_at: string | null;
  exercises: Exercise[];
};

async function fetchWorkoutHistory(): Promise<Workout[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('workouts')
    .select('*, exercises(*, completed_sets(*))')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data || [];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatDuration(startedAt: string, finishedAt: string | null): string | null {
  if (!finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getTotalSets(exercises: Exercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.completed_sets.length, 0);
}

function getWeightSummary(sets: CompletedSet[]): string {
  const weights = sets
    .map((s) => s.weight)
    .filter((w): w is number => w !== null && w > 0);
  if (weights.length === 0) return 'Bodyweight';
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  if (min === max) return `${max} lbs`;
  return `${min}-${max} lbs`;
}

// Icons
function BackArrowIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.textSecondary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDownIcon({ rotated }: { rotated: boolean }) {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}
    >
      <Path
        d="M6 9l6 6 6-6"
        stroke={colors.textTertiary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DumbbellIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 6.5h-1a1 1 0 00-1 1v9a1 1 0 001 1h1a1 1 0 001-1v-9a1 1 0 00-1-1zM17.5 6.5h1a1 1 0 011 1v9a1 1 0 01-1 1h-1a1 1 0 01-1-1v-9a1 1 0 011-1zM7.5 12h9M3.5 9v6M20.5 9v6"
        stroke={colors.textTertiary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z"
        stroke={colors.textTertiary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const duration = formatDuration(workout.started_at, workout.finished_at);
  const totalSets = getTotalSets(workout.exercises);
  const exerciseCount = workout.exercises.length;

  return (
    <Pressable onPress={() => setExpanded((prev) => !prev)}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.borderLight,
          overflow: 'hidden',
        }}
      >
        {/* Card Header */}
        <View style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  fontFamily: 'DMSans-SemiBold',
                  fontSize: 16,
                  color: colors.textPrimary,
                }}
                numberOfLines={1}
              >
                {workout.name || 'Workout'}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                {formatDate(workout.started_at)}
              </Text>
            </View>
            <ChevronDownIcon rotated={expanded} />
          </View>

          {/* Stats Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {duration && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <ClockIcon />
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono-Medium',
                    fontSize: 12,
                    color: colors.textTertiary,
                  }}
                >
                  {duration}
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.primaryMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono-Bold',
                    fontSize: 11,
                    color: colors.primary,
                  }}
                >
                  {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: 'rgba(52, 211, 153, 0.10)',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'JetBrainsMono-Bold',
                    fontSize: 11,
                    color: colors.success,
                  }}
                >
                  {totalSets} {totalSets === 1 ? 'set' : 'sets'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expanded Exercise List */}
        {expanded && workout.exercises.length > 0 && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 14,
              gap: 10,
            }}
          >
            {workout.exercises.map((exercise) => (
              <View key={exercise.id} style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans-Medium',
                      fontSize: 14,
                      color: colors.textPrimary,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'JetBrainsMono-Medium',
                      fontSize: 12,
                      color: colors.textTertiary,
                    }}
                  >
                    {exercise.completed_sets.length} {exercise.completed_sets.length === 1 ? 'set' : 'sets'}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans',
                    fontSize: 12,
                    color: colors.textTertiary,
                  }}
                >
                  {getWeightSummary(exercise.completed_sets)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function WorkoutHistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    const data = await fetchWorkoutHistory();
    setWorkouts(data);
  }, []);

  useEffect(() => {
    loadWorkouts().finally(() => setLoading(false));
  }, [loadWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.borderLight,
          }}
        >
          <BackArrowIcon />
        </Pressable>
        <Text
          style={{
            fontFamily: 'DMSans-Bold',
            fontSize: 20,
            color: colors.textPrimary,
          }}
        >
          Workout History
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : workouts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 16 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DumbbellIcon />
          </View>
          <Text
            style={{
              fontFamily: 'DMSans-SemiBold',
              fontSize: 18,
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            No workouts yet
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans',
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Complete your first workout and it will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
