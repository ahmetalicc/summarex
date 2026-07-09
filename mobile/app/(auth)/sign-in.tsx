import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert(t('auth.signInFailed'), error.message);
  }

  return (
    <AuthScaffold
      eyebrow={t('auth.signInEyebrow')}
      title={t('auth.welcomeTitle')}
      subtitle={t('auth.welcomeSubtitle')}
      footer={
        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} style={styles.forgot}>
            <Text style={[styles.link, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/sign-up')} hitSlop={8} style={styles.switchRow}>
            <Text style={[styles.muted, { color: colors.textMuted }]}>{t('auth.toSignUp')} </Text>
            <Text style={[styles.link, { color: colors.primary }]}>{t('auth.toSignUpLink')}</Text>
          </Pressable>
        </View>
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
        placeholder={t('auth.passwordPlaceholder')}
        passwordToggle
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSignIn}
        returnKeyType="go"
      />
      <Button label={t('auth.signInButton')} variant="primary" size="lg" fullWidth isLoading={loading} onPress={handleSignIn} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  forgot: { alignSelf: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  muted: { fontFamily: Fonts.body, fontSize: 14 },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 14 },
});
