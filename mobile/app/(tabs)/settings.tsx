import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <View style={s.content}>
        <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.dark.bgSurface,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.dark.text },
  content: { padding: 20 },
  signOutButton: {
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.error + '44',
    alignItems: 'center',
  },
  signOutText: { color: Colors.dark.error, fontSize: 15, fontWeight: '600' },
});
