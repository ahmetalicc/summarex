import { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Brand } from '@/components/Brand';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    brand: { alignItems: 'center', marginBottom: 48 },
    brandTagline: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: 20, padding: 28,
      borderWidth: 1.5, borderColor: colors.border,
    },
    cardTitle: { fontSize: 20, fontFamily: Fonts.display, color: colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, marginBottom: 24 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
      color: colors.text, fontSize: 15, fontFamily: Fonts.body,
    },
    inputFocused: { borderColor: colors.primary },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12, paddingVertical: 16,
      alignItems: 'center', marginTop: 8,
    },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.displaySemiBold },
    divider: { height: 1, backgroundColor: colors.border, marginTop: 24 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted },
    footerLink: { color: colors.primary, fontFamily: Fonts.bodyMedium },
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
      Alert.alert(t('auth.signUpFailed'), error.message);
    } else {
      Alert.alert(
        t('auth.checkEmailTitle'),
        t('auth.checkEmailBody'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.brand}>
          <Brand size="lg" />
          <Text style={s.brandTagline}>{t('common.tagline')}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('auth.createTitle')}</Text>
          <Text style={s.cardSubtitle}>{t('auth.createSubtitle')}</Text>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.email')}</Text>
            <TextInput
              style={[s.input, focused === 'email' && s.inputFocused]}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('auth.password')}</Text>
            <TextInput
              style={[s.input, focused === 'password' && s.inputFocused]}
              placeholder={t('auth.minPassword')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignUp}
              returnKeyType="go"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <TouchableOpacity style={s.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>{t('auth.signUpButton')}</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.divider} />
        <TouchableOpacity onPress={() => router.back()} style={s.footer}>
          <Text style={s.footerText}>{t('auth.toSignIn')} </Text>
          <Text style={[s.footerText, s.footerLink]}>{t('auth.toSignInLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
