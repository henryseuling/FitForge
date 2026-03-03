import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useChatStore } from '@/stores/useChatStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${isUser ? 'You' : 'Coach'}: ${message.content}`} style={{ alignItems: isUser ? 'flex-end' : 'flex-start', paddingHorizontal: 20, paddingVertical: 4 }}>
      <View style={{
        maxWidth: isUser ? 280 : 300,
        paddingVertical: 14, paddingHorizontal: 16, gap: 8,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        borderBottomRightRadius: isUser ? 4 : 18,
        backgroundColor: isUser ? 'rgba(232, 168, 56, 0.1)' : colors.surface,
        borderWidth: 1,
        borderColor: isUser ? 'rgba(232, 168, 56, 0.12)' : 'rgba(255,255,255,0.04)',
        borderLeftWidth: isUser ? 1 : 2,
        borderLeftColor: isUser ? 'rgba(232, 168, 56, 0.12)' : 'rgba(232, 168, 56, 0.25)',
      }}>
        <Text style={{ fontFamily: 'DMSans', fontSize: 14, lineHeight: 21, color: colors.textPrimary }}>{message.content}</Text>
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

export default function ChatScreen() {
  const { messages, isLoading, sendUserMessage } = useChatStore();
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
    if (!messageText) return;
    setInputText('');
    await sendUserMessage(messageText);
  };

  const quickActions = [
    { label: "What should I do today?", message: "What should I work on today? Based on my recent workouts and recovery, what's the best plan?" },
    { label: "How's my progress?", message: "How's my overall progress looking? Any areas I should focus on?" },
    { label: 'Meal ideas', message: "I need a high-protein meal idea to hit my macro targets today. What do you suggest?" },
    { label: 'Am I overtraining?', message: "Am I overtraining? Look at my recent workout volume and recovery data." },
    { label: 'Help me break a plateau', message: "I feel like I've hit a plateau. Can you suggest changes to help me break through?" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Chat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: workoutName ? colors.success : colors.textTertiary }} />
            <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>
              {workoutName ? 'Workout loaded' : 'No workout loaded'}
            </Text>
          </View>
        </View>

        {/* Context Pill */}
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, backgroundColor: 'rgba(232, 168, 56, 0.08)', borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.12)' }}>
            <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.primary, letterSpacing: 0.3 }}>
              {workoutName ? `${workoutName} · Day ${dayNumber}` : 'No active workout'}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <View style={{ alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 4 }}>
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surface, borderLeftWidth: 2, borderLeftColor: 'rgba(232, 168, 56, 0.25)' }}>
                <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textTertiary }}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8, flexDirection: 'row' }}>
          {quickActions.map((action) => (
            <QuickAction key={action.label} label={action.label} onPress={() => handleSend(action.message)} />
          ))}
        </ScrollView>

        {/* Input Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            placeholder="Ask anything..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="send"
            accessibilityLabel="Chat message input"
            accessibilityHint="Type a message to your AI coach"
            style={{
              flex: 1, paddingVertical: 10, paddingHorizontal: 16,
              borderRadius: 24, backgroundColor: colors.surface,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
              fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary,
            }}
          />
          <Pressable onPress={() => handleSend()} accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !inputText.trim() }} style={{
            width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: inputText.trim() ? colors.primary : colors.elevated,
          }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: inputText.trim() ? colors.bg : colors.textTertiary }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
