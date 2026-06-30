import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          <View style={s.logoMark}>
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={s.brandName}>Summarex</Text>
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
              placeholderTextColor={Colors.dark.textMuted}
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
              placeholderTextColor={Colors.dark.textMuted}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  brand: { alignItems: 'center', marginBottom: 36 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoLetter: { fontSize: 28, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 26, fontWeight: '700', color: Colors.dark.text, letterSpacing: -0.5 },
  brandTagline: { fontSize: 13, color: Colors.dark.textMuted, marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: Colors.dark.textMuted, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.dark.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.dark.bg,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: Colors.dark.text, fontSize: 15,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.dark.textMuted },
  footerLink: { color: Colors.dark.primary, fontWeight: '600' },
});
