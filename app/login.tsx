import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (isSignUp && !name) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    const result = isSignUp
      ? await signUp(email, password, name)
      : await signIn(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          {/* Logo area */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <Text style={{
              fontFamily: 'JetBrainsMono-ExtraBold',
              fontSize: 36,
              color: colors.primary,
              letterSpacing: -1.5,
            }}>
              FitForge
            </Text>
            <Text style={{
              fontFamily: 'DMSans',
              fontSize: 15,
              color: colors.textTertiary,
              marginTop: 8,
            }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14 }}>
            {isSignUp && (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                accessibilityLabel="Full name"
                accessibilityHint="Enter your full name to create an account"
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
            )}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email address"
              accessibilityHint="Enter your email address"
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

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              accessibilityLabel="Password"
              accessibilityHint="Enter your password"
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

            {error ? (
              <Text style={{
                fontFamily: 'DMSans',
                fontSize: 13,
                color: colors.danger,
                textAlign: 'center',
              }}>
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? 'Create Account' : 'Sign In'}
              accessibilityState={{ disabled: loading }}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={{
                  fontFamily: 'DMSans-Bold',
                  fontSize: 16,
                  color: colors.bg,
                }}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Forgot password */}
          {!isSignUp && (
            <Pressable
              onPress={() => {
                if (!email) {
                  Alert.alert('Enter your email', 'Type your email address above, then tap "Forgot password?" again.');
                  return;
                }
                supabase.auth.resetPasswordForEmail(email).then(({ error: err }) => {
                  if (err) {
                    Alert.alert('Error', err.message);
                  } else {
                    Alert.alert('Check your email', 'We sent a password reset link to ' + email);
                  }
                });
              }}
              style={{ marginTop: 16, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'DMSans', fontSize: 13, color: colors.textTertiary }}>Forgot password?</Text>
            </Pressable>
          )}

          {/* Toggle */}
          <Pressable
            onPress={() => { setIsSignUp(!isSignUp); setError(''); }}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'DMSans', fontSize: 14, color: colors.textSecondary }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={{ color: colors.primary, fontFamily: 'DMSans-SemiBold' }}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
