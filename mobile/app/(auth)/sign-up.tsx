import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Trans, useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { authErrorKey, MIN_PASSWORD_LENGTH } from '@/lib/authErrors';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  function openLink(url: string) { WebBrowser.openBrowserAsync(url); }

  async function handleSignUp() {
    if (!email || !password) return;
    setPasswordError(undefined);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('auth.errorWeakPassword'));
      return;
    }
    setLoading(true);
    // The language the user is seeing in the app (EN/TR), same value web sends.
    const lang = i18n.language?.startsWith('tr') ? 'tr' : 'en';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Web sends `lang`; mobile used to send `ui_language`. We send both, with the same value,
        // until we know which key the Supabase email templates read (dashboard, not in the repo).
        data: { lang, ui_language: lang },
        emailRedirectTo: 'summarex://confirm',
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.signUpFailed'), t(authErrorKey(error)));
    } else if (!data.session) {
      // "Confirm email" is ON: no session yet. (If a session did come back, the root layout signs us in.)
      Alert.alert(
        t('auth.checkEmailTitle'),
        t('auth.checkEmailBody'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  const legalLink = { color: colors.primary, fontFamily: Fonts.bodySemiBold };

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
        error={passwordError}
        onSubmitEditing={handleSignUp}
        returnKeyType="go"
      />
      <Button label={t('auth.signUpButton')} variant="primary" size="lg" fullWidth isLoading={loading} onPress={handleSignUp} />
      <View>
        <Text style={[styles.legal, { color: colors.textMuted }]}>
          <Trans
            i18nKey="auth.agreeTerms"
            components={{
              terms: <Text style={legalLink} onPress={() => openLink('https://summarex.app/terms')} />,
              privacy: <Text style={legalLink} onPress={() => openLink('https://summarex.app/privacy')} />,
            }}
          />
        </Text>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  muted: { fontFamily: Fonts.body, fontSize: 14 },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 14 },
  legal: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
