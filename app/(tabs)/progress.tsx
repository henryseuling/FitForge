import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { useProgressStore } from '@/stores/useProgressStore';

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
  const progress = mStrengthNextTier > 0 ? mStrengthScore / mStrengthNextTier : 0;

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

export default function ProgressScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Progress</Text>
          <PeriodSelector />
        </View>

        <MStrengthCard />
        <VolumeChart />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary }}>Key Lifts</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>Est. 1RM</Text>
        </View>

        <KeyLiftsGrid />
        <BodyMetrics />

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
