import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useProgressStore } from '@/stores/useProgressStore';
import { fetchExerciseProfiles, fetch1RMHistory } from '@/lib/api';

function PeriodSelector() {
  const { period, setPeriod } = useProgressStore();
  const options = ['week', 'month', 'all'] as const;

  return (
    <View style={{ flexDirection: 'row', borderRadius: 10, backgroundColor: colors.surface, padding: 3, gap: 2 }}>
      {options.map((p) => (
        <Pressable
          key={p}
          onPress={() => setPeriod(p)}
          style={{
            paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8,
            backgroundColor: period === p ? colors.elevated : 'transparent',
          }}
        >
          <Text style={{
            fontFamily: period === p ? 'DMSans-SemiBold' : 'DMSans',
            fontSize: 12, color: period === p ? colors.textPrimary : colors.textTertiary,
            textTransform: 'capitalize',
          }}>{p}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MStrengthCard() {
  const { mStrengthScore, mStrengthDelta, mStrengthTier, mStrengthNextTier } = useProgressStore();
  const progress = mStrengthNextTier > 0 ? Math.min(mStrengthScore / mStrengthNextTier, 1) : 0;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 8, padding: 20, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.15)', gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7 }}>mStrength Score</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 40, color: colors.textPrimary }}>{mStrengthScore}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                <Path d="M5 8V2M5 2L2 5M5 2l3 3" stroke={colors.success} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.success }}>+{mStrengthDelta}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232, 168, 56, 0.12)', borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.2)' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.primary }}>{mStrengthTier}</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>Progress to next tier</Text>
          <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 11, color: colors.textSecondary }}>{mStrengthScore} / {mStrengthNextTier}</Text>
        </View>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.elevated, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />
        </View>
      </View>
    </View>
  );
}

function VolumeChart() {
  const { volumeData } = useProgressStore();
  if (volumeData.length === 0) {
    return (
      <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Weekly Volume</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 }}>No volume data yet. Complete a workout to see your weekly breakdown.</Text>
      </View>
    );
  }
  const maxSets = Math.max(...volumeData.map((d) => d.maxSets), 1);

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Weekly Volume</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>sets per muscle</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingTop: 8, gap: 6 }}>
        {volumeData.map((d) => (
          <View key={d.muscle} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: (d.sets / maxSets) * 80, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: d.muscle === 'Shoulders' ? colors.success : colors.primary, opacity: 0.8 }} />
            <Text style={{ fontFamily: 'DMSans', fontSize: 9, color: colors.textTertiary }}>{d.muscle}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function KeyLiftsGrid() {
  const { keyLifts } = useProgressStore();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 }}>
      {keyLifts.map((lift) => (
        <View key={lift.name} style={{ flex: 1, minWidth: 155, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary }}>{lift.name}</Text>
          <Text>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 24, color: colors.textPrimary }}>{lift.weight}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}> lb</Text>
          </Text>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: lift.delta > 0 ? colors.success : colors.warning }}>
            {lift.delta > 0 ? '+' : ''}{lift.delta} lb
          </Text>
        </View>
      ))}
    </View>
  );
}

function BodyMetrics() {
  const { weight, sleepAvg, hrvAvg, streak } = useProgressStore();
  const metrics = [
    { label: 'Weight', value: weight.toString(), unit: 'lb', color: colors.textPrimary },
    { label: 'Sleep', value: sleepAvg.toString(), unit: 'hrs avg', color: colors.textPrimary },
    { label: 'HRV', value: hrvAvg.toString(), unit: 'ms avg', color: colors.success },
    { label: 'Streak', value: streak.toString(), unit: 'days', color: colors.primary },
  ];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 10 }}>
      <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Body Metrics</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {metrics.map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>{m.label}</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 18, color: m.color }}>{m.value}</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textSecondary }}>{m.unit}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function WorkoutStreak() {
  const { streak } = useProgressStore();

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: streak > 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255,255,255,0.04)' }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2C6.5 7.5 3 11.5 3 15a9 9 0 0018 0c0-3.5-3.5-7.5-9-13z" fill={streak > 0 ? colors.success : colors.textTertiary} opacity={0.9} />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>Current Streak</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontFamily: 'JetBrainsMono-ExtraBold', fontSize: 32, color: streak > 0 ? colors.success : colors.textTertiary }}>{streak}</Text>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textSecondary }}>consecutive {streak === 1 ? 'day' : 'days'}</Text>
        </View>
      </View>
    </View>
  );
}

function WorkoutCalendarHeatMap() {
  const { workoutHistory } = useProgressStore();

  const calendarData = useMemo(() => {
    // Build a set of dates that have completed workouts
    const workoutDates = new Set(
      workoutHistory
        .filter((w) => w.completed_at)
        .map((w) => new Date(w.started_at).toISOString().split('T')[0])
    );

    // Generate 28 days (4 weeks) ending today
    const today = new Date();
    const days: { date: string; dayOfWeek: number; hasWorkout: boolean; isToday: boolean }[] = [];

    // Find the start: go back to fill a complete 4-week grid aligned to Sunday
    const endDate = new Date(today);
    // Go back 27 days from today for 28 total days
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 27);

    // Adjust startDate back to the nearest Sunday
    const startDow = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDow);

    // Now generate days from startDate up to and including today
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayOfWeek: current.getDay(),
        hasWorkout: workoutDates.has(dateStr),
        isToday: dateStr === today.toISOString().split('T')[0],
      });
      current.setDate(current.getDate() + 1);
    }

    // Organize into weeks (rows)
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Ensure the last week has 7 entries by padding
    const lastWeek = weeks[weeks.length - 1];
    if (lastWeek && lastWeek.length < 7) {
      // Pad the end so the grid is complete (future days)
      while (lastWeek.length < 7) {
        const nextDate = new Date(endDate);
        nextDate.setDate(endDate.getDate() + (lastWeek.length - endDate.getDay()));
        lastWeek.push({
          date: '',
          dayOfWeek: lastWeek.length,
          hasWorkout: false,
          isToday: false,
        });
      }
    }

    // Count workouts in the period
    const workoutCount = days.filter((d) => d.hasWorkout).length;

    return { weeks, workoutCount, totalDays: days.length };
  }, [workoutHistory]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Activity</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>{calendarData.workoutCount} workouts in {calendarData.totalDays}d</Text>
      </View>

      {/* Day of week headers */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {dayLabels.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.textTertiary }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {calendarData.weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={{ flexDirection: 'row', gap: 4 }}>
          {week.map((day, dayIndex) => (
            <View key={dayIndex} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: day.hasWorkout
                    ? 'rgba(52, 211, 153, 0.2)'
                    : day.date ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderWidth: day.isToday ? 1.5 : 0,
                  borderColor: day.isToday ? colors.primary : 'transparent',
                }}
              >
                {day.hasWorkout && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
                )}
                {!day.hasWorkout && day.date && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function WeightChart() {
  const { weightHistory } = useProgressStore();

  const chartData = useMemo(() => {
    // Take last 8 data points, reversed to chronological order
    const recent = weightHistory.slice(0, 8).reverse();
    if (recent.length === 0) return null;

    const weights = recent.map((c) => c.weight_kg);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const range = maxWeight - minWeight || 1;

    // Determine trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recent.length >= 2) {
      const firstHalf = weights.slice(0, Math.floor(weights.length / 2));
      const secondHalf = weights.slice(Math.floor(weights.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      if (diff > 0.3) trend = 'up';
      else if (diff < -0.3) trend = 'down';
    }

    return {
      points: recent.map((c) => ({
        weight: c.weight_kg,
        date: new Date(c.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        height: ((c.weight_kg - minWeight) / range) * 70 + 10,
      })),
      minWeight,
      maxWeight,
      trend,
      latest: weights[weights.length - 1],
    };
  }, [weightHistory]);

  if (!chartData) {
    return (
      <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Body Weight</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 }}>No weight check-ins yet. Log your weight to track trends.</Text>
      </View>
    );
  }

  const trendLabel = chartData.trend === 'up' ? 'Trending up' : chartData.trend === 'down' ? 'Trending down' : 'Stable';
  const trendColor = chartData.trend === 'down' ? colors.success : chartData.trend === 'up' ? colors.warning : colors.textSecondary;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Body Weight</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: trendColor }}>{trendLabel}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary }}>{chartData.latest.toFixed(1)}</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>kg latest</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingTop: 8, gap: 6 }}>
        {chartData.points.map((p, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 8, color: colors.textTertiary }}>{p.weight.toFixed(1)}</Text>
            <View
              style={{
                width: '100%',
                height: p.height,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: i === chartData.points.length - 1 ? colors.primary : 'rgba(232, 168, 56, 0.4)',
              }}
            />
            <Text style={{ fontFamily: 'DMSans', fontSize: 8, color: colors.textTertiary }}>{p.date}</Text>
          </View>
        ))}
      </View>

      {/* Range indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: 10, color: colors.textTertiary }}>Low: {chartData.minWeight.toFixed(1)} kg</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 10, color: colors.textTertiary }}>High: {chartData.maxWeight.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

function PersonalRecords() {
  const { personalRecords } = useProgressStore();

  if (personalRecords.length === 0) {
    return (
      <View style={{ marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Personal Records</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center', paddingVertical: 20 }}>No personal records yet. Complete workouts with tracked weights to see PRs here.</Text>
      </View>
    );
  }

  // Show top 6 PRs
  const topPRs = personalRecords.slice(0, 6);

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Personal Records</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>All-time bests</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {topPRs.map((pr, i) => (
          <View
            key={pr.name}
            style={{
              flex: 1,
              minWidth: 155,
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: i === 0 ? 'rgba(232, 168, 56, 0.15)' : 'rgba(255,255,255,0.04)',
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {i === 0 && (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={colors.primary} />
                </Svg>
              )}
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{pr.name}</Text>
            </View>
            <Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary }}>{pr.weight}</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}> lb</Text>
            </Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 10, color: colors.textTertiary }}>
              {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ExerciseProfilesSection() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchExerciseProfiles()
      .then((data) => setProfiles(data.filter((p: any) => p.estimated_1rm)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setHistory([]); return; }
    fetch1RMHistory(selected, 10)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [selected]);

  if (profiles.length === 0) return null;

  const topProfiles = profiles
    .sort((a: any, b: any) => (b.estimated_1rm || 0) - (a.estimated_1rm || 0))
    .slice(0, 8);

  const maxE1RM = history.length > 0 ? Math.max(...history.map((h: any) => h.estimated_1rm || 0), 1) : 1;

  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, gap: 10 }}>
      <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Exercise Profiles</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {topProfiles.map((p: any) => {
          const isSelected = selected === p.exercise_id;
          return (
            <Pressable
              key={p.exercise_id}
              onPress={() => { setSelected(isSelected ? null : p.exercise_id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                padding: 12, borderRadius: 12, backgroundColor: colors.surface,
                borderWidth: 1, borderColor: isSelected ? colors.primary + '44' : 'rgba(255,255,255,0.04)',
                minWidth: 155, flex: 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{p.exercise_name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 20, color: colors.textPrimary }}>{Math.round(p.estimated_1rm)}</Text>
                <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>e1RM</Text>
              </View>
              {p.current_working_weight && (
                <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>Working: {p.current_working_weight} lb</Text>
              )}
              {p.total_times_performed && (
                <Text style={{ fontFamily: 'DMSans', fontSize: 10, color: colors.textTertiary }}>{p.total_times_performed}x performed</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* 1RM History Chart */}
      {selected && history.length > 1 && (
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 10 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary }}>1RM Progression</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, gap: 4 }}>
            {history.map((h: any, i: number) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 8, color: colors.textTertiary }}>{Math.round(h.estimated_1rm)}</Text>
                <View style={{
                  width: '100%',
                  height: Math.max(((h.estimated_1rm || 0) / maxE1RM) * 60, 4),
                  borderTopLeftRadius: 3, borderTopRightRadius: 3,
                  backgroundColor: i === history.length - 1 ? colors.primary : 'rgba(232, 168, 56, 0.4)',
                }} />
                <Text style={{ fontFamily: 'DMSans', fontSize: 7, color: colors.textTertiary }}>
                  {new Date(h.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function ProgressScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const keyLiftsCount = useProgressStore((s) => s.keyLifts.length);

  const handleRefresh = async () => {
    setRefreshing(true);
    await useProgressStore.getState().loadProgress();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Progress</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/goals'); }}
              style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primaryMuted }}
            >
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: colors.primary }}>Goals</Text>
            </Pressable>
            <PeriodSelector />
          </View>
        </View>

        <MStrengthCard />
        <WorkoutStreak />
        <WorkoutCalendarHeatMap />
        <VolumeChart />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Key Lifts</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>Est. 1RM</Text>
        </View>

        {keyLiftsCount === 0 ? (
          <View style={{ marginHorizontal: 20, padding: 24, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>No lift data yet</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center' }}>Log your key lifts through workouts or ask your AI coach to record them.</Text>
          </View>
        ) : (
          <KeyLiftsGrid />
        )}

        <PersonalRecords />
        <ExerciseProfilesSection />
        <WeightChart />
        <BodyMetrics />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
