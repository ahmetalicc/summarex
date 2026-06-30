import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Brand } from '@/components/Brand';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    brand: { alignItems: 'center', marginBottom: 36 },
    brandTagline: { fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: 16, padding: 24,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 24 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
      color: colors.text, fontSize: 15,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10, paddingVertical: 15,
      alignItems: 'center', marginTop: 8,
    },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    linkRow: { alignItems: 'center', marginTop: 16 },
    link: { color: colors.primary, fontSize: 14 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, color: colors.textMuted },
    footerLink: { color: colors.primary, fontWeight: '600' },
  }), [colors]);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Brand size="lg" />
          <Text style={s.brandTagline}>Record it. Transcribe it. Understand it.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome back</Text>
          <Text style={s.cardSubtitle}>Sign in to access your recordings.</Text>

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignIn}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity style={s.button} onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={s.linkRow}>
            <Text style={s.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Text style={[s.footerText, s.footerLink]}>Sign up</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
