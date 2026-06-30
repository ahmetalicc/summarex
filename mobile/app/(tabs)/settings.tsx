import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
import type { Entitlement } from '@/lib/api';

function formatReset(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Chevron() {
  return <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />;
}

function RowItem({ label, rightText, onPress }: { label: string; rightText?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.rowItem} onPress={onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        {rightText ? <Text style={s.rowRightText}>{rightText}</Text> : null}
        <Chevron />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => {});

    api.entitlement.me()
      .then(setEntitlement)
      .catch(() => {});
  }, []);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  function comingSoon(title: string, message: string) {
    Alert.alert(title, message);
  }

  function openLink(url: string) {
    WebBrowser.openBrowserAsync(url);
  }

  const isPro = entitlement?.tier === 'pro';
  const pct = entitlement
    ? Math.min(100, (entitlement.minutes_used / entitlement.minutes_limit) * 100)
    : 0;
  const barColor = pct > 90 ? Colors.dark.error : pct >= 70 ? Colors.dark.accent : Colors.dark.primary;
  const initial = email ? email.charAt(0).toUpperCase() : '?';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Account */}
      <View style={s.accountCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <View style={s.accountInfo}>
          <Text style={s.email}>{email ?? ''}</Text>
          <View style={[s.planBadge, isPro ? s.planBadgePro : s.planBadgeFree]}>
            <Text style={[s.planBadgeText, isPro ? s.planBadgeTextPro : s.planBadgeTextFree]}>
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </Text>
          </View>
        </View>
      </View>

      {/* Usage */}
      <Text style={s.sectionHeader}>USAGE</Text>
      <View style={s.usageCard}>
        <View style={s.usageHeaderRow}>
          <Text style={s.usageTitle}>Monthly Usage</Text>
          {entitlement && (
            <Text style={s.usageReset}>Resets {formatReset(entitlement.resets_at)}</Text>
          )}
        </View>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <View style={s.usageBottomRow}>
          <Text style={s.usageBottomText}>
            {entitlement ? Math.round(entitlement.minutes_used) : 0} min used
          </Text>
          <Text style={s.usageBottomText}>
            of {entitlement ? entitlement.minutes_limit : 0} min
          </Text>
        </View>
      </View>

      {/* Upgrade */}
      {entitlement && !isPro && (
        <>
          <Text style={s.sectionHeader}>PRO</Text>
          <View style={s.upgradeCard}>
            <View style={s.upgradeHeaderRow}>
              <Text style={s.upgradeTitle}>Upgrade to Pro</Text>
              <View style={s.upgradePill}>
                <Text style={s.upgradePillText}>20 hrs/mo</Text>
              </View>
            </View>
            <Text style={s.upgradeSubtitle}>Priority processing · Unlimited sharing</Text>
            <Text style={s.upgradePrice}>$9.99 / month</Text>
            <TouchableOpacity
              style={s.upgradeButton}
              onPress={() => comingSoon('Coming Soon', 'In-app purchases are coming in the next update.')}
            >
              <Text style={s.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* App */}
      <Text style={s.sectionHeader}>APP</Text>
      <RowItem
        label="Language"
        rightText="English"
        onPress={() => comingSoon('Coming Soon', 'Multi-language support is coming soon.')}
      />
      <RowItem
        label="Appearance"
        rightText="Dark"
        onPress={() => comingSoon('Coming Soon', 'Light mode is coming in the next update.')}
      />

      {/* Legal */}
      <Text style={s.sectionHeader}>LEGAL</Text>
      <RowItem label="Privacy Policy" onPress={() => openLink('https://summarex.app/privacy')} />
      <RowItem label="Terms of Service" onPress={() => openLink('https://summarex.app/terms')} />
      <RowItem label="Contact Us" onPress={() => openLink('https://summarex.app/contact')} />

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  accountCard: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
    backgroundColor: Colors.dark.bgSurface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 16, padding: 16,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  accountInfo: { flex: 1 },
  email: { color: Colors.dark.text, fontSize: 15, fontWeight: '600' },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
    marginTop: 6,
  },
  planBadgeFree: { backgroundColor: Colors.dark.textMuted + '22' },
  planBadgePro: { backgroundColor: Colors.dark.primary + '22' },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  planBadgeTextFree: { color: Colors.dark.textMuted },
  planBadgeTextPro: { color: Colors.dark.primary },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: Colors.dark.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 8, marginTop: 28, paddingHorizontal: 4,
  },

  usageCard: {
    backgroundColor: Colors.dark.bgSurface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 12, padding: 16,
  },
  usageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  usageTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark.text },
  usageReset: { fontSize: 12, color: Colors.dark.textMuted },
  barTrack: {
    marginTop: 12, height: 6, borderRadius: 3,
    backgroundColor: Colors.dark.border, overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  usageBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8,
  },
  usageBottomText: { fontSize: 12, color: Colors.dark.textMuted },

  upgradeCard: {
    backgroundColor: Colors.dark.bgSurface,
    borderWidth: 1, borderColor: Colors.dark.primary + '44',
    borderRadius: 16, padding: 20,
  },
  upgradeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark.text },
  upgradePill: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
  },
  upgradePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  upgradeSubtitle: { fontSize: 13, color: Colors.dark.textMuted, marginTop: 4 },
  upgradePrice: { color: Colors.dark.primary, fontSize: 22, fontWeight: '700', marginTop: 12 },
  upgradeButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  upgradeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dark.bgSurface,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15,
    marginBottom: 8,
  },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.dark.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowRightText: { fontSize: 14, color: Colors.dark.textMuted },

  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: Colors.dark.error,
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 32,
  },
  signOutText: { color: Colors.dark.error, fontSize: 15, fontWeight: '700' },
});
