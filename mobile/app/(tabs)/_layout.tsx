import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { hapticImpact } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_META: Record<string, { icon: IoniconsName; labelKey: string }> = {
  index: { icon: 'home', labelKey: 'tabs.home' },
  transcribe: { icon: 'document-text', labelKey: 'tabs.transcribe' },
  summarize: { icon: 'sparkles', labelKey: 'tabs.summarize' },
  settings: { icon: 'person', labelKey: 'tabs.settings' },
};

// Structural subset of React Navigation's BottomTabBarProps — the package's
// type declarations aren't installed standalone, so we type what we consume.
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function FloatingTabBar({ state, navigation }: TabBarProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const s = styles(colors);

  const inner = (
    <View style={s.row}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        function onPress() {
          hapticImpact();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        const color = focused ? colors.primary : colors.textMuted;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={[s.tab, focused && s.tabActive]}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Ionicons
              name={focused ? meta.icon : (`${meta.icon}-outline` as IoniconsName)}
              size={22}
              color={color}
            />
            <Text style={[s.label, { color }]} numberOfLines={1}>
              {t(meta.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[s.wrap, { bottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint={theme === 'dark' ? 'dark' : 'light'} style={s.blur}>
          {inner}
        </BlurView>
      ) : (
        <View style={[s.blur, { backgroundColor: colors.bgSurface }]}>{inner}</View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transcribe" />
      <Tabs.Screen name="summarize" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

function styles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 16, right: 16,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 12 },
      }),
    },
    blur: {
      padding: 8,
      // Frosted glass on iOS still needs a translucent base tint underneath.
      ...Platform.select({ ios: { backgroundColor: colors.bgSurface + 'B0' } }),
    },
    row: {
      flexDirection: 'row',
      height: 52,
      alignItems: 'stretch',
    },
    tab: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    tabActive: {
      backgroundColor: colors.bgElevated,
      borderColor: `rgba(${colors.primaryRgb}, 0.2)`,
    },
    label: {
      fontFamily: Fonts.mono,
      fontSize: 9.5,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
}
