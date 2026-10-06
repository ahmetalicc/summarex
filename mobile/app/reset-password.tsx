import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { authErrorKey, MIN_PASSWORD_LENGTH } from '@/lib/authErrors';
import { useAuthLink } from '@/contexts/AuthLinkContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const authLink = useAuthLink();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // The form is only usable once the emailed link has been exchanged for a recovery session.
  const hasRecoverySession = authLink.kind === 'recovery' && authLink.status === 'success';
  const verifying = authLink.status === 'checking' || (authLink.status === 'processing' && authLink.kind === 'recovery');

  async function handleUpdate() {
    if (loading) return;
    setPasswordError(undefined);
    setConfirmError(undefined);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('auth.errorWeakPassword'));
      return;
    }
    if (password !== confirm) {
      setConfirmError(t('auth.errorPasswordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Session vanished (expired / signed out elsewhere): the link can no longer be used.
        authLink.clear();
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert(t('common.error'), t(authErrorKey(error)));
        return;
      }
      setDone(true);
      // The recovery session is a full login; end it so the user signs in with the new password.
      await supabase.auth.signOut({ scope: 'local' });
      router.replace({ pathname: '/(auth)/sign-in', params: { notice: 'passwordUpdated' } });
    } catch {
      Alert.alert(t('common.error'), t('auth.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    // Leaving without saving: don't keep the recovery session as a logged-in session.
    await supabase.auth.signOut({ scope: 'local' });
    authLink.clear();
    router.replace('/(auth)/sign-in');
  }

  if (verifying) {
    return (
      <AuthScaffold eyebrow={t('auth.resetEyebrow')} title={t('auth.verifyingLink')} subtitle={t('auth.verifyingLinkSubtitle')}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AuthScaffold>
    );
  }

  if (!hasRecoverySession && !done) {
    return (
      <AuthScaffold
        eyebrow={t('auth.resetEyebrow')}
        title={t('auth.linkInvalidTitle')}
        subtitle={t('auth.linkInvalidBody')}
        footer={
          <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={8} style={styles.footerLink}>
            <Text style={[styles.link, { color: colors.primary }]}>{t('auth.backToSignIn')}</Text>
          </Pressable>
        }
      >
        <Button
          label={t('auth.requestNewLink')}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      eyebrow={t('auth.resetEyebrow')}
      title={t('auth.newPasswordTitle')}
      subtitle={t('auth.newPasswordSubtitle')}
      footer={
        <Pressable onPress={handleCancel} hitSlop={8} style={styles.footerLink}>
          <Text style={[styles.link, { color: colors.primary }]}>{t('auth.backToSignIn')}</Text>
        </Pressable>
      }
    >
      <Input
        label={t('auth.password')}
        leftIcon="lock-closed-outline"
        placeholder={t('auth.newPasswordPlaceholder')}
        passwordToggle
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        returnKeyType="next"
      />
      <Input
        label={t('auth.confirmPassword')}
        leftIcon="lock-closed-outline"
        placeholder={t('auth.confirmPasswordPlaceholder')}
        passwordToggle
        autoComplete="new-password"
        value={confirm}
        onChangeText={setConfirm}
        error={confirmError}
        onSubmitEditing={handleUpdate}
        returnKeyType="go"
      />
      <Button
        label={t('auth.updatePassword')}
        variant="primary"
        size="lg"
        fullWidth
        isLoading={loading}
        disabled={!hasRecoverySession}
        onPress={handleUpdate}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: Spacing.lg },
  footerLink: { alignItems: 'center', marginTop: Spacing.lg },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 14 },
});
