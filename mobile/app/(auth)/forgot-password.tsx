import { useState } from 'react';
import { Text, StyleSheet, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(
        t('auth.resetSentTitle'),
        t('auth.resetSentBody'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(auth)/sign-in') }]
      );
    }
  }

  return (
    <AuthScaffold
      eyebrow={t('auth.resetEyebrow')}
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <Pressable onPress={() => router.replace('/(auth)/sign-in')} hitSlop={8} style={styles.switchRow}>
          <Text style={[styles.link, { color: colors.primary }]}>{t('auth.backToSignIn')}</Text>
        </Pressable>
      }
    >
      <Input
        label={t('auth.email')}
        leftIcon="mail-outline"
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={handleReset}
        returnKeyType="go"
      />
      <Button label={t('auth.sendResetLink')} variant="primary" size="lg" fullWidth isLoading={loading} onPress={handleReset} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchRow: { alignItems: 'center', marginTop: Spacing.lg },
  link: { fontFamily: Fonts.bodySemiBold, fontSize: 14 },
});
