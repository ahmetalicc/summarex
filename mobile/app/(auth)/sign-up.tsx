import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Brand } from '@/components/Brand';

export default function SignUpScreen() {
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
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, color: colors.textMuted },
    footerLink: { color: colors.primary, fontWeight: '600' },
  }), [colors]);

  async function handleSignUp() {
    if (!email || !password) return;
    setLoading(true);
    let locale = 'en';
    try {
      locale = getLocales()[0]?.languageCode ?? 'en';
    } catch {
      try { locale = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0]; } catch {}
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { ui_language: locale },
        emailRedirectTo: 'summarex://confirm',
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Tap it to activate your account.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Brand size="lg" />
          <Text style={s.brandTagline}>Record it. Transcribe it. Understand it.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Create account</Text>
          <Text style={s.cardSubtitle}>Free during beta. No credit card required.</Text>

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
              placeholder="min 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignUp}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity style={s.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Text style={[s.footerText, s.footerLink]}>Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
