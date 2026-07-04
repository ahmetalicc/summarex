import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import 'react-native-url-polyfill/auto';
import '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const bootColors = Colors[systemScheme === 'light' ? 'light' : 'dark'];
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const didRedirect = useRef(false);

  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
  });

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

  if (!fontsLoaded) return null;

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bootColors.bg }}>
        <ActivityIndicator color={bootColors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="meeting/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
