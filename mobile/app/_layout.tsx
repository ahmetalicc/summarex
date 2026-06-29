import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-url-polyfill/auto';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const didRedirect = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const segs = segments as string[];
    const inAuth = segs[0] === '(auth)';
    const inConfirm = segs[0] === 'confirm';
    const inReset = segs[0] === 'reset-password';

    if (!session && !inAuth && !inConfirm && !inReset) {
      didRedirect.current = true;
      router.replace('/(auth)/sign-in');
    } else if (session && (inAuth || (!didRedirect.current && segs.length === 0))) {
      router.replace('/(tabs)');
    }
  }, [initialized, session, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.bg }}>
        <ActivityIndicator color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="reset-password" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
