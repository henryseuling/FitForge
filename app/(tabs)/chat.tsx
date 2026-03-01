import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useChatStore } from '@/stores/useChatStore';
import { useWorkoutStore } from '@/stores/useWorkoutStore';

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';

  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', paddingHorizontal: 20, paddingVertical: 4 }}>
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
    { label: 'Swap exercise', message: "Can you suggest a swap for my current exercise? I'd like something that targets the same muscle group." },
    { label: 'Adjust volume', message: "Based on my readiness score, should we adjust today's volume?" },
    { label: 'Form check', message: "Can you give me form cues for my current exercise?" },
    { label: 'Meal idea', message: "I need a high-protein meal idea to hit my macro targets today." },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: colors.textPrimary, letterSpacing: -0.8 }}>Chat</Text>
          {workoutName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
              <Text style={{ fontFamily: 'DMSans', fontSize: 12, color: colors.textTertiary }}>Workout loaded</Text>
            </View>
          ) : null}
        </View>

        {/* Context Pill */}
        {workoutName ? (
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, backgroundColor: 'rgba(232, 168, 56, 0.08)', borderWidth: 1, borderColor: 'rgba(232, 168, 56, 0.12)' }}>
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.primary, letterSpacing: 0.3 }}>{workoutName} · Day {dayNumber}</Text>
            </View>
          </View>
        ) : null}

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 6, gap: 8, flexDirection: 'row' }}>
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
            style={{
              flex: 1, paddingVertical: 10, paddingHorizontal: 16,
              borderRadius: 24, backgroundColor: colors.surface,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
              fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary,
            }}
          />
          <Pressable onPress={() => handleSend()} style={{
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
