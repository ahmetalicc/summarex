import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Brand } from '@/components/Brand';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    brand: { alignItems: 'center', marginBottom: 36 },
    brandTagline: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: 16, padding: 24,
      borderWidth: 1.5, borderColor: colors.border,
    },
    cardTitle: { fontSize: 20, fontFamily: Fonts.display, color: colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, marginBottom: 24 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
      color: colors.text, fontSize: 15, fontFamily: Fonts.body,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 10, paddingVertical: 15,
      alignItems: 'center', marginTop: 8,
    },
    buttonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },
    linkRow: { alignItems: 'center', marginTop: 16 },
    link: { color: colors.primary, fontSize: 14, fontFamily: Fonts.bodyMedium },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted },
    footerLink: { color: colors.primary, fontFamily: Fonts.bodyMedium },
  }), [colors]);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert(t('auth.signInFailed'), error.message);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Brand size="lg" />
          <Text style={s.brandTagline}>{t('common.tagline')}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('auth.welcomeTitle')}</Text>
          <Text style={s.cardSubtitle}>{t('auth.welcomeSubtitle')}</Text>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.email')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.password')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('auth.passwordPlaceholder')}
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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{t('auth.signInButton')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={s.linkRow}>
            <Text style={s.link}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={s.footer}>
          <Text style={s.footerText}>{t('auth.toSignUp')} </Text>
          <Text style={[s.footerText, s.footerLink]}>{t('auth.toSignUpLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
