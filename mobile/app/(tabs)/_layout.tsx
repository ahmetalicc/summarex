import { Tabs } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarStyle: {
          backgroundColor: Colors.dark.bgSurface,
          borderTopColor: Colors.dark.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Meetings' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
