import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    if (!password) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('auth.passwordUpdatedTitle'), t('auth.passwordUpdatedBody'), [
        { text: t('common.ok'), onPress: () => router.replace('/(auth)/sign-in') },
      ]);
    }
  }

  return (
    <AuthScaffold
      eyebrow={t('auth.resetEyebrow')}
      title={t('auth.newPasswordTitle')}
      subtitle={t('auth.newPasswordSubtitle')}
    >
      <Input
        label={t('auth.password')}
        leftIcon="lock-closed-outline"
        placeholder={t('auth.newPasswordPlaceholder')}
        passwordToggle
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleUpdate}
        returnKeyType="go"
      />
      <Button label={t('auth.updatePassword')} variant="primary" size="lg" fullWidth isLoading={loading} onPress={handleUpdate} />
    </AuthScaffold>
  );
}
