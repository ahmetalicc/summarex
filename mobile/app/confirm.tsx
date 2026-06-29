import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function ConfirmScreen() {
  const router = useRouter();

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
      <ActivityIndicator size="large" color={Colors.dark.primary} />
      <Text style={s.text}>Confirming your account…</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.bg },
  text: { color: Colors.dark.textMuted, marginTop: 16, fontSize: 15 },
});
