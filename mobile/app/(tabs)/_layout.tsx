import { Platform, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName, focused: boolean, color: string) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={22} color={color} />;
}

function tabLabel(focused: boolean, children: React.ReactNode, colors: ColorScheme) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 11,
          fontFamily: Fonts.body,
          color: focused ? colors.primary : colors.textMuted,
        }}
      >
        {children}
      </Text>
      {focused && (
        <View
          style={{
            width: 4, height: 4, borderRadius: 2,
            backgroundColor: colors.primary, marginTop: 2,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 72 : 60,
          paddingBottom: Platform.OS === 'ios' ? 16 : 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },
        tabBarLabel: ({ focused, children }) => tabLabel(focused, children, colors),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, color }) => tabIcon('grid', focused, color as string),
        }}
      />
      <Tabs.Screen
        name="transcribe"
        options={{
          title: t('tabs.transcribe'),
          tabBarIcon: ({ focused, color }) => tabIcon('document-text', focused, color as string),
        }}
      />
      <Tabs.Screen
        name="summarize"
        options={{
          title: t('tabs.summarize'),
          tabBarIcon: ({ focused, color }) => tabIcon('sparkles', focused, color as string),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused, color }) => tabIcon('person', focused, color as string),
        }}
      />
    </Tabs>
  );
}
