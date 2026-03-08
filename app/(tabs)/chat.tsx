import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { useChatStore } from '@/stores/useChatStore';
import { useNutritionStore } from '@/stores/useNutritionStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${isUser ? 'You' : 'Coach'}: ${message.content}`} style={{ alignItems: isUser ? 'flex-end' : 'flex-start', paddingHorizontal: 20, paddingVertical: 4 }}>
      <View style={{
        width: isUser ? undefined : '100%',
        maxWidth: isUser ? 320 : '100%',
        paddingVertical: isUser ? 14 : 6,
        paddingHorizontal: isUser ? 16 : 0,
        gap: 8,
        borderTopLeftRadius: isUser ? 18 : 0,
        borderTopRightRadius: isUser ? 18 : 0,
        borderBottomLeftRadius: isUser ? 18 : 0,
        borderBottomRightRadius: isUser ? 4 : 0,
        backgroundColor: isUser ? 'rgba(232, 168, 56, 0.1)' : 'transparent',
        borderWidth: isUser ? 1 : 0,
        borderColor: isUser ? 'rgba(232, 168, 56, 0.12)' : 'transparent',
        borderLeftWidth: isUser ? 1 : 0,
        borderLeftColor: isUser ? 'rgba(232, 168, 56, 0.12)' : 'transparent',
      }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: isUser ? 14 : 16, lineHeight: isUser ? 21 : 28, color: colors.textPrimary }}>{message.content}</Text>
        <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: isUser ? colors.textSecondary : colors.textTertiary }}>{message.timestamp}</Text>
      </View>
    </View>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 14,
        borderRadius: 100, backgroundColor: colors.surface,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

function CoachStatusStrip() {
  const { workoutName, dayNumber, readinessScore, hrv, sleepScore, recoveryScore } = useWorkoutStore();
  const { calorieTarget, totalCalories, proteinTarget, totalProtein } = useNutritionStore();

  const remainingCalories = Math.max(calorieTarget - totalCalories(), 0);
  const remainingProtein = Math.max(proteinTarget - totalProtein(), 0);
  const recoveryLabel =
    recoveryScore != null
      ? `${recoveryScore}/100 recovery`
      : readinessScore != null
        ? `${readinessScore}/100 estimated readiness`
        : 'No recovery estimate yet';
  const workoutLabel = workoutName
    ? dayNumber > 0
      ? `${workoutName} · Day ${dayNumber}`
      : `${workoutName} · Up next`
    : 'No workout drafted yet';

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 6,
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.textPrimary }}>
            {workoutLabel}
          </Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textSecondary }}>
            {recoveryLabel}
            {hrv != null ? ` · HRV ${hrv}` : ''}
            {sleepScore != null ? ` · Sleep ${sleepScore}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'JetBrainsMono-Bold', fontSize: 14, color: colors.primary }}>{remainingCalories} kcal</Text>
          <Text style={{ fontFamily: 'DMSans', fontSize: 11, color: colors.textTertiary }}>{remainingProtein}g protein left</Text>
        </View>
      </View>
    </View>
  );
}

function ComposerAction({
  label,
  tone = 'default',
  onPress,
}: {
  label: string;
  tone?: 'default' | 'primary';
  onPress: () => void;
}) {
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: isPrimary ? colors.primaryMuted : colors.elevated,
        borderWidth: 1,
        borderColor: isPrimary ? 'rgba(232, 168, 56, 0.16)' : 'rgba(255,255,255,0.04)',
      }}
    >
      <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 12, color: isPrimary ? colors.primary : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const { messages, isLoading, chatStatus, sendUserMessage, lastError, retryLastMessage, pendingUndo, undoLastAction, clearPendingUndo } = useChatStore();
  const { workoutName, dayNumber } = useWorkoutStore();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll when new messages arrive
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading) return;
    setInputText('');
    await sendUserMessage(messageText);
  };

  const quickActions = [
    { label: "What should I do today?", message: "What should I work on today? Based on my recent workouts and recovery, what's the best plan?" },
    { label: "How's my progress?", message: "How's my overall progress looking? Any areas I should focus on?" },
    { label: 'Meal ideas', message: "I need a high-protein meal idea to hit my macro targets today. What do you suggest?" },
  ];
  const showStarterActions = messages.length <= 2 && !pendingUndo;

  const workoutStatusLabel = workoutName ? (dayNumber > 0 ? 'Workout loaded' : 'Next workout ready') : 'No workout loaded';
  const workoutContextLabel = workoutName
    ? dayNumber > 0
      ? `${workoutName} · Day ${dayNumber}`
      : `${workoutName} · Up next`
    : 'No active workout';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Chat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: workoutName ? colors.success : colors.textTertiary }} />
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
              {workoutStatusLabel}
            </Text>
          </View>
        </View>

        <CoachStatusStrip />

        {pendingUndo && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 10,
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              gap: 10,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                Last AI Change
              </Text>
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textSecondary }}>
                {pendingUndo.summary}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={undoLastAction}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: colors.primaryMuted,
                  borderWidth: 1,
                  borderColor: 'rgba(232, 168, 56, 0.16)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary }}>
                  {pendingUndo.action.label}
                </Text>
              </Pressable>
              {pendingUndo.reviewRoute && (
                <Pressable
                  onPress={() => router.push(pendingUndo.reviewRoute as any)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: colors.elevated,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textPrimary }}>
                    Review
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={clearPendingUndo}
                style={{
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textTertiary }}>
                  Dismiss
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && chatStatus !== 'streaming' && (
            <View style={{ alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 4 }}>
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface, borderLeftWidth: 2, borderLeftColor: 'rgba(232, 168, 56, 0.25)' }}>
                <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary }}>
                  {chatStatus === 'sending' ? 'Sending...' : chatStatus === 'calling_tools' ? 'Updating your data...' : 'Thinking...'}
                </Text>
              </View>
            </View>
          )}
          {lastError && lastError.retryable && !isLoading && (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Pressable
                onPress={retryLastMessage}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 8, paddingHorizontal: 16,
                  borderRadius: 100, backgroundColor: 'rgba(232, 168, 56, 0.1)',
                  borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.2)',
                }}
              >
                <Text style={{ fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary }}>↻ Retry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {showStarterActions && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8, flexDirection: 'row' }}>
            {quickActions.map((action) => (
              <QuickAction key={action.label} label={action.label} onPress={() => handleSend(action.message)} />
            ))}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ComposerAction label="Food Photo" tone="primary" onPress={() => router.push('/camera?source=chat')} />
            <ComposerAction label="Next Workout" onPress={() => handleSend("What's my next workout and why?")} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
              placeholder="Ask coach anything or tell it what to update..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="send"
              accessibilityLabel="Chat message input"
              accessibilityHint="Type a message to your AI coach"
              editable={!isLoading}
              style={{
                flex: 1, paddingVertical: 12, paddingHorizontal: 16,
                borderRadius: 18, backgroundColor: colors.surface,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary,
              }}
            />
            <Pressable disabled={isLoading} onPress={() => handleSend()} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !inputText.trim() || isLoading }} style={{
              minWidth: 56, height: 44, paddingHorizontal: 14, borderRadius: 14,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.elevated,
            }}>
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: inputText.trim() && !isLoading ? colors.bg : colors.textTertiary }}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
