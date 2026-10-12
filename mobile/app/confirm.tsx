import { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthLink } from '@/contexts/AuthLinkContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/ui';

export default function ConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { status, kind, clear } = useAuthLink();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    text: { color: colors.textMuted, marginTop: 16, fontSize: 15, fontFamily: Fonts.body },
  }), [colors]);

  useEffect(() => {
    if (status === 'success') {
      // The link was exchanged for a session (see AuthLinkContext). A recovery link that landed here
      // still needs the new-password screen; everything else goes straight into the app.
      if (kind === 'recovery') {
        router.replace('/reset-password');
      } else {
        router.replace('/(tabs)');
      }
    } else if (status === 'idle') {
      // Opened without a usable link (e.g. summarex://confirm by hand): fall back to any existing session.
      supabase.auth.getSession().then(({ data }) => {
        router.replace(data.session ? '/(tabs)' : '/(auth)/sign-in');
      });
    }
  }, [status, kind]);

  if (status === 'error') {
    return (
      <AuthScaffold
        eyebrow={t('auth.signInEyebrow')}
        title={t('auth.linkInvalidTitle')}
        subtitle={t('auth.confirmLinkInvalidBody')}
      >
        <Button
          label={t('auth.backToSignIn')}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => { clear(); router.replace('/(auth)/sign-in'); }}
        />
      </AuthScaffold>
    );
  }

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={s.text}>{t('auth.confirming')}</Text>
    </View>
  );
}
