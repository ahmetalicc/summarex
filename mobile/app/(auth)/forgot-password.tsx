import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'summarex://reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Email sent',
        'If an account exists for that address, you\'ll receive a reset link.',
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
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Reset password</Text>
          <Text style={s.cardSubtitle}>Enter your email and we'll send a reset link.</Text>

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleReset}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity style={s.button} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send Reset Link</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={s.footer}>
          <Text style={[s.footerText, s.footerLink]}>← Back to sign in</Text>
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
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: Colors.dark.textMuted },
  footerLink: { color: Colors.dark.primary, fontWeight: '600' },
});
