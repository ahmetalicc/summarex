import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName, focused: boolean, color: string) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={22} color={color} />;
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
          backgroundColor: colors.bgSurface + 'F5',
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: Fonts.bodyMedium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, color }) => tabIcon('home', focused, color as string),
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
