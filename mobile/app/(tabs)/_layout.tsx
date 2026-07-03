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
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.border,
          height: 58,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: Fonts.bodyMedium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('recordings.title'),
          tabBarIcon: ({ focused, color }) => tabIcon('mic', focused, color as string),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ focused, color }) => tabIcon('person', focused, color as string),
        }}
      />
    </Tabs>
  );
}
