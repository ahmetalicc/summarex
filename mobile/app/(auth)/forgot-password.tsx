import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Brand } from '@/components/Brand';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    brand: { alignItems: 'center', marginBottom: 36 },
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
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { fontSize: 14, color: colors.textMuted },
    footerLink: { color: colors.primary, fontWeight: '600' },
  }), [colors]);

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
        "If an account exists for that address, you'll receive a reset link.",
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Brand size="lg" />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Reset password</Text>
          <Text style={s.cardSubtitle}>Enter your email and we'll send a reset link.</Text>

          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
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
