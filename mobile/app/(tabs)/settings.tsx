import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import type { Entitlement } from '@/lib/api';

function formatReset(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export default function SettingsScreen() {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loadingEnt, setLoadingEnt] = useState(true);

  useEffect(() => {
    api.entitlement.me()
      .then(setEntitlement)
      .catch(() => {})
      .finally(() => setLoadingEnt(false));
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  const pct = entitlement
    ? Math.min(100, Math.round((entitlement.minutes_used / entitlement.minutes_limit) * 100))
    : 0;

  const barColor = pct >= 90
    ? Colors.dark.error
    : pct >= 70
    ? Colors.dark.accent
    : Colors.dark.primary;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <View style={s.content}>
        {/* Entitlement card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Monthly usage</Text>
            {entitlement && (
              <View style={[s.tierBadge, entitlement.tier === 'pro' && s.tierBadgePro]}>
                <Text style={[s.tierText, entitlement.tier === 'pro' && s.tierTextPro]}>
                  {entitlement.tier === 'pro' ? 'Pro' : 'Free'}
                </Text>
              </View>
            )}
          </View>

          {loadingEnt && (
            <ActivityIndicator color={Colors.dark.primary} style={{ marginTop: 12 }} />
          )}

          {!loadingEnt && entitlement && (
            <>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
              </View>
              <Text style={s.usageText}>
                {Math.round(entitlement.minutes_used)} of {entitlement.minutes_limit} min used
              </Text>
              <Text style={s.resetText}>Resets {formatReset(entitlement.resets_at)}</Text>
            </>
          )}

          {!loadingEnt && !entitlement && (
            <Text style={s.usageText}>Could not load usage data.</Text>
          )}
        </View>

        {/* Sign out */}
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
  content: { padding: 20, gap: 16 },
  card: {
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.dark.text },
  tierBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: Colors.dark.bgElevated,
  },
  tierBadgePro: { backgroundColor: Colors.dark.primary + '22' },
  tierText: { fontSize: 11, fontWeight: '700', color: Colors.dark.textMuted, textTransform: 'uppercase' },
  tierTextPro: { color: Colors.dark.primary },
  barTrack: {
    height: 6, backgroundColor: Colors.dark.bgElevated,
    borderRadius: 3, overflow: 'hidden', marginBottom: 8,
  },
  barFill: { height: 6, borderRadius: 3 },
  usageText: { fontSize: 13, color: Colors.dark.text, marginBottom: 4 },
  resetText: { fontSize: 12, color: Colors.dark.textMuted },
  signOutButton: {
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 10, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.error + '44',
    alignItems: 'center',
  },
  signOutText: { color: Colors.dark.error, fontSize: 15, fontWeight: '600' },
});
