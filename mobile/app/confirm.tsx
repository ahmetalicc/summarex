import { useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

export default function ConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    text: { color: colors.textMuted, marginTop: 16, fontSize: 15 },
  }), [colors]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    });
  }, []);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={s.text}>Confirming your account…</Text>
    </View>
  );
}
