import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/constants/colors';
import type { Entitlement } from '@/lib/api';

function formatReset(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function RowItem({ label, rightText, onPress, colors }: {
  label: string; rightText?: string; onPress: () => void; colors: ColorScheme;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.bgSurface,
        borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15,
        marginBottom: 8,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {rightText ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{rightText}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    accountCard: {
      flexDirection: 'row', gap: 14, alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 16, padding: 16,
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    accountInfo: { flex: 1 },
    email: { color: colors.text, fontSize: 15, fontWeight: '600' },
    planBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
      marginTop: 6,
    },
    planBadgeFree: { backgroundColor: colors.textMuted + '22' },
    planBadgePro: { backgroundColor: colors.primary + '22' },
    planBadgeText: { fontSize: 11, fontWeight: '700' },
    planBadgeTextFree: { color: colors.textMuted },
    planBadgeTextPro: { color: colors.primary },

    sectionHeader: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted,
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 8, marginTop: 28, paddingHorizontal: 4,
    },

    usageCard: {
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 16,
    },
    usageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    usageTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    usageReset: { fontSize: 12, color: colors.textMuted },
    barTrack: {
      marginTop: 12, height: 6, borderRadius: 3,
      backgroundColor: colors.border, overflow: 'hidden',
    },
    barFill: { height: 6, borderRadius: 3 },
    usageBottomRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 8,
    },
    usageBottomText: { fontSize: 12, color: colors.textMuted },

    upgradeCard: {
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.primary + '44',
      borderRadius: 16, padding: 20,
    },
    upgradeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    upgradePill: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
    },
    upgradePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    upgradeSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    upgradePrice: { color: colors.primary, fontSize: 22, fontWeight: '700', marginTop: 12 },
    upgradeButton: {
      backgroundColor: colors.primary,
      borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', marginTop: 16,
    },
    upgradeButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

    signOutButton: {
      backgroundColor: 'transparent',
      borderWidth: 1.5, borderColor: colors.error,
      borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', marginTop: 32,
    },
    signOutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  }), [colors]);

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
  const barColor = pct > 90 ? colors.error : pct >= 70 ? colors.accent : colors.primary;
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
        colors={colors}
      />
      <RowItem
        label="Appearance"
        rightText={theme === 'dark' ? 'Dark' : 'Light'}
        onPress={toggleTheme}
        colors={colors}
      />

      {/* Legal */}
      <Text style={s.sectionHeader}>LEGAL</Text>
      <RowItem label="Privacy Policy" onPress={() => openLink('https://summarex.app/privacy')} colors={colors} />
      <RowItem label="Terms of Service" onPress={() => openLink('https://summarex.app/terms')} colors={colors} />
      <RowItem label="Contact Us" onPress={() => openLink('https://summarex.app/contact')} colors={colors} />

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
