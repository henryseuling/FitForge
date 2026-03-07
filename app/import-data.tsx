import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '@/lib/theme';
import { parseImportText, ParsedWorkout } from '@/lib/importParsers';
import { matchAllExercises, ExerciseMatch } from '@/lib/exerciseMatcher';
import { createDataImport, updateDataImport, bulkInsertImportedWorkouts, upsertExerciseProfile, record1RMHistory } from '@/lib/api';
import { generateImportCalibration, parseImportedWorkoutsWithAI } from '@/lib/workoutEngine';

type Source = 'strong' | 'fitbod' | 'hevy' | 'csv' | 'json';

const SOURCES: Array<{ id: Source; label: string; desc: string }> = [
  { id: 'strong', label: 'Strong', desc: 'CSV export from Strong app' },
  { id: 'fitbod', label: 'Fitbod', desc: 'CSV export from Fitbod app' },
  { id: 'hevy', label: 'Hevy', desc: 'CSV export from Hevy app' },
  { id: 'csv', label: 'Generic CSV', desc: 'Any CSV with workout data' },
  { id: 'json', label: 'JSON', desc: 'JSON file with workout data' },
];

function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ImportDataScreen() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<Source | null>(null);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedWorkouts, setParsedWorkouts] = useState<ParsedWorkout[]>([]);
  const [exerciseMatches, setExerciseMatches] = useState<ExerciseMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ workouts: number; exercises: number } | null>(null);
  const [parseMode, setParseMode] = useState<'local' | 'ai' | null>(null);

  const hasUsableWorkouts = (workouts: ParsedWorkout[]) =>
    workouts.some((workout) =>
      workout.exercises.some((exercise) => exercise.sets.some((set) => set.reps > 0 || set.weight > 0))
    );

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: source === 'json' ? 'application/json' : 'text/csv',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setFileName(file.name);
      // Read file content
      const response = await fetch(file.uri);
      const text = await response.text();
      setRawText(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const handleParse = useCallback(async () => {
    if (!rawText || !source) return;
    setLoading(true);
    try {
      let workouts = parseImportText(source, rawText);
      let mode: 'local' | 'ai' = 'local';

      if (!hasUsableWorkouts(workouts)) {
        workouts = await parseImportedWorkoutsWithAI({ source, rawText });
        mode = 'ai';
      }

      if (!hasUsableWorkouts(workouts)) {
        throw new Error('FitForge could not extract usable workouts from this file. Try a different export format or paste a larger sample.');
      }

      setParsedWorkouts(workouts);
      setParseMode(mode);

      // Get unique exercise names and match them
      const exerciseNames = [...new Set(workouts.flatMap((w) => w.exercises.map((e) => e.name)))];
      const matches = matchAllExercises(exerciseNames);
      setExerciseMatches(matches);

      setStep(2); // Preview
    } catch (e: any) {
      Alert.alert('Parse Error', e.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [rawText, source]);

  const handleImport = async () => {
    setLoading(true);
    try {
      // Create import record
      const importRecord = await createDataImport({ source: source || 'unknown', file_name: fileName });

      // Map exercise IDs
      const matchMap = new Map(exerciseMatches.filter((m) => m.autoConfirmed).map((m) => [m.originalName, m]));
      const mappedWorkouts = parsedWorkouts.map((w) => ({
        name: w.workoutName || 'Workout',
        started_at: w.date,
        completed_at: w.date,
        duration_minutes: 0,
        exercises: w.exercises.map((ex) => {
          const match = matchMap.get(ex.name);
          return {
            name: match?.exerciseName || ex.name,
            muscle_group: '',
            exercise_id: match?.exerciseId,
            sets: ex.sets.map((s, i) => ({
              set_number: i + 1,
              weight: s.weight,
              reps: s.reps,
              is_warmup: s.isWarmup || false,
              rpe: s.rpe ?? undefined,
            })),
          };
        }),
      }));

      const result = await bulkInsertImportedWorkouts(mappedWorkouts);
      await updateDataImport(importRecord.id, {
        workouts_imported: result.totalWorkouts,
        exercises_mapped: result.totalExercises,
        status: 'completed',
      });

      setImportResult({ workouts: result.totalWorkouts, exercises: result.totalExercises });

      // Try AI calibration (non-blocking)
      const importedData = parsedWorkouts.flatMap((w) =>
        w.exercises.map((ex) => ({
          exerciseName: ex.name,
          exerciseId: matchMap.get(ex.name)?.exerciseId,
          recentSets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, date: w.date })),
        }))
      );
      generateImportCalibration({ importedData })
        .then(async (profiles) => {
          await Promise.all(
            profiles.map(async (profile) => {
              await upsertExerciseProfile(profile).catch(() => {});
              await record1RMHistory({
                exercise_id: profile.exercise_id,
                exercise_name: profile.exercise_name,
                estimated_1rm: profile.estimated_1rm,
              }).catch(() => {});
            })
          );
        })
        .catch(() => {});

      setStep(3);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Import Error', e.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Steps ─────────────────────────────────────────────────────

  function renderSourcePicker() {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 }}>Import Data</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            Bring your workout history from another app. Select your source below.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          {SOURCES.map((s) => {
            const isSelected = source === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => { setSource(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{
                  padding: 16, borderRadius: 14, backgroundColor: colors.surface,
                  borderWidth: 1.5, borderColor: isSelected ? colors.primary : 'rgba(255,255,255,0.06)',
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <View style={{
                  width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                  borderColor: isSelected ? colors.primary : colors.textTertiary,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: isSelected ? colors.primary : colors.textPrimary }}>{s.label}</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>{s.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function renderUpload() {
    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 }}>Upload File</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            Pick a file from your device or paste the content below.
          </Text>
        </View>

        <Pressable
          onPress={handlePickFile}
          style={{
            padding: 24, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
            borderColor: rawText ? colors.success : 'rgba(255,255,255,0.1)',
            backgroundColor: rawText ? 'rgba(52, 211, 153, 0.05)' : colors.surface,
            alignItems: 'center', gap: 8,
          }}
        >
          {rawText ? (
            <>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.success }}>File loaded</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{fileName || 'Pasted content'}</Text>
              <Text style={{ fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: colors.textTertiary }}>{rawText.length.toLocaleString()} characters</Text>
            </>
          ) : (
            <>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke={colors.textTertiary} strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary }}>Choose File</Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
                {source === 'json' ? '.json' : '.csv'} file
              </Text>
            </>
          )}
        </Pressable>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>Or paste content</Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            placeholder="Paste CSV or JSON here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={6}
            style={{
              fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
              minHeight: 120, textAlignVertical: 'top',
            }}
          />
        </View>
      </View>
    );
  }

  function renderPreview() {
    const totalExercises = parsedWorkouts.reduce((sum, w) => sum + w.exercises.length, 0);
    const totalSets = parsedWorkouts.reduce((sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0), 0);
    const confirmed = exerciseMatches.filter((m) => m.autoConfirmed).length;
    const unconfirmed = exerciseMatches.filter((m) => !m.autoConfirmed);
    const dateRange = parsedWorkouts.length > 0
      ? `${new Date(parsedWorkouts[parsedWorkouts.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(parsedWorkouts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : '';

    return (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 }}>Preview</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>Review parsed data before importing.</Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.primary }}>{parsedWorkouts.length}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>workouts</Text>
          </View>
          <View style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.success }}>{totalExercises}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>exercises</Text>
          </View>
          <View style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 22, color: colors.textPrimary }}>{totalSets}</Text>
            <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>sets</Text>
          </View>
        </View>

        {dateRange && <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{dateRange}</Text>}
        {parseMode && (
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
            Parsed with {parseMode === 'local' ? 'direct import parser' : 'AI-assisted fallback'}
          </Text>
        )}

        {/* Exercise matching */}
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 8 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>Exercise Matching</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
            {confirmed} of {exerciseMatches.length} exercises matched automatically
          </Text>
          {unconfirmed.length > 0 && (
            <View style={{ gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.warning, textTransform: 'uppercase', letterSpacing: 0.6 }}>Unrecognized ({unconfirmed.length})</Text>
              {unconfirmed.slice(0, 5).map((m) => (
                <View key={m.originalName} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>{m.originalName}</Text>
                  <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
                    {m.exerciseName ? `→ ${m.exerciseName}` : 'No match'}
                  </Text>
                </View>
              ))}
              {unconfirmed.length > 5 && (
                <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>+{unconfirmed.length - 5} more</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderComplete() {
    return (
      <View style={{ gap: 20, alignItems: 'center', paddingTop: 40 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(52, 211, 153, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12l5 5L20 7" stroke={colors.success} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.textPrimary }}>Import Complete</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Successfully imported {importResult?.workouts || 0} workouts with {importResult?.exercises || 0} exercises.
          </Text>
        </View>
        <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary, textAlign: 'center' }}>
          Your AI coach is calibrating based on your history. This may take a moment.
        </Text>
      </View>
    );
  }

  const canProceed = () => {
    switch (step) {
      case 0: return !!source;
      case 1: return rawText.length > 0;
      case 2: return parsedWorkouts.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 0) setStep(1);
    else if (step === 1) handleParse();
    else if (step === 2) handleImport();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Pressable
          onPress={() => step === 0 || step === 3 ? router.back() : setStep(step - 1)}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <BackArrow />
        </Pressable>
        {step < 3 && (
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2].map((s) => (
              <View key={s} style={{ flex: s <= step ? 1 : 0.6, height: 3, borderRadius: 1.5, backgroundColor: s <= step ? colors.primary : colors.elevated }} />
            ))}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && renderSourcePicker()}
        {step === 1 && renderUpload()}
        {step === 2 && renderPreview()}
        {step === 3 && renderComplete()}
      </ScrollView>

      {/* Bottom button */}
      {step < 3 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 }}>
          <Pressable
            onPress={handleNext}
            disabled={!canProceed() || loading}
            style={{
              paddingVertical: 16, borderRadius: 14, alignItems: 'center',
              backgroundColor: canProceed() && !loading ? colors.primary : colors.elevated,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: canProceed() ? colors.bg : colors.textTertiary }}>
                {step === 0 ? 'Continue' : step === 1 ? 'Parse Data' : 'Import'}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.back(); }}
            style={{ paddingVertical: 16, borderRadius: 14, alignItems: 'center', backgroundColor: colors.primary }}
          >
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.bg }}>Done</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
