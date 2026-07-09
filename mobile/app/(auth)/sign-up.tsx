import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
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
    <AuthScaffold
      eyebrow={t('auth.signUpEyebrow')}
      title={t('auth.createTitle')}
      subtitle={t('auth.createSubtitle')}
      footer={
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={8} style={styles.switchRow}>
          <Text style={[styles.muted, { color: colors.textMuted }]}>{t('auth.toSignIn')} </Text>
          <Text style={[styles.link, { color: colors.primary }]}>{t('auth.toSignInLink')}</Text>
        </Pressable>
      }
    >
      <Input
        label={t('auth.email')}
        leftIcon="mail-outline"
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label={t('auth.password')}
        leftIcon="lock-closed-outline"
        placeholder={t('auth.minPassword')}
        passwordToggle
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSignUp}
        returnKeyType="go"
      />
      <Button label={t('auth.signUpButton')} variant="primary" size="lg" fullWidth isLoading={loading} onPress={handleSignUp} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  muted: { fontFamily: Fonts.body, fontSize: 14 },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 14 },
});
