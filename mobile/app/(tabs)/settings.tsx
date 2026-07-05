import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';
import type { Entitlement } from '@/lib/api';

function formatReset(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function UsageBar({ pct, color, trackColor }: { pct: number; color: string; trackColor: string }) {
  const width = useSharedValue(0);

  // Refill from 0 on every screen focus, not just mount
  useFocusEffect(
    useCallback(() => {
      width.value = 0;
      width.value = withDelay(300, withSpring(pct, { damping: 20, stiffness: 120 }));
    }, [pct, width])
  );

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      style={{
        marginTop: 12, height: 6, borderRadius: 3,
        backgroundColor: trackColor, overflow: 'hidden',
      }}
    >
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, fillStyle]} />
    </View>
  );
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
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 17,
        marginBottom: 8,
      }}
    >
      <Text style={{ flex: 1, fontSize: 15, fontFamily: Fonts.bodyMedium, color: colors.text }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {rightText ? (
          <Text style={{ fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted }}>{rightText}</Text>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors, theme, toggleTheme, language, setLanguage } = useTheme();
  const { t } = useTranslation();
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
    avatarRing: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 2, borderColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#FFFFFF', fontSize: 22, fontFamily: Fonts.display },
    accountInfo: { flex: 1 },
    email: { color: colors.text, fontSize: 16, fontFamily: Fonts.displaySemiBold },
    planBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
      marginTop: 6,
    },
    planBadgeFree: { backgroundColor: colors.textMuted + '22' },
    planBadgePro: { backgroundColor: colors.primary + '22' },
    planBadgeText: { fontSize: 11, fontFamily: Fonts.display, textTransform: 'uppercase', letterSpacing: 0.5 },
    planBadgeTextFree: { color: colors.textMuted },
    planBadgeTextPro: { color: colors.primary },

    sectionHeader: {
      fontSize: 11, fontFamily: Fonts.displaySemiBold, color: colors.textMuted,
      letterSpacing: 1, textTransform: 'uppercase',
      marginBottom: 8, marginTop: 28, paddingHorizontal: 4,
    },

    usageCard: {
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 16,
    },
    usageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    usageTitle: { fontSize: 14, fontFamily: Fonts.displaySemiBold, color: colors.text },
    usageReset: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    usageBottomRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 8,
    },
    usageBottomText: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },

    upgradeCard: {
      backgroundColor: colors.primary + '15',
      borderWidth: 1.5, borderColor: colors.primary,
      borderRadius: 16, padding: 20,
    },
    upgradeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    upgradeTitle: { fontSize: 17, fontFamily: Fonts.display, color: colors.text },
    upgradePill: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99,
    },
    upgradePillText: { color: '#FFFFFF', fontSize: 11, fontFamily: Fonts.bodyMedium, fontWeight: '700' },
    upgradeSubtitle: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 4 },
    upgradePrice: { color: colors.primary, fontSize: 24, fontFamily: Fonts.display, marginTop: 12 },
    upgradeButton: {
      backgroundColor: colors.primary,
      borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', marginTop: 16,
    },
    upgradeButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: Fonts.displaySemiBold },

    signOutButton: {
      backgroundColor: 'transparent',
      borderWidth: 1.5, borderColor: colors.error,
      borderRadius: 10, paddingVertical: 14,
      alignItems: 'center', marginTop: 32,
    },
    signOutText: { color: colors.error, fontSize: 15, fontFamily: Fonts.bodyMedium },
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
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'), style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
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
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
        </View>
        <View style={s.accountInfo}>
          <Text style={s.email}>{email ?? ''}</Text>
          <View style={[s.planBadge, isPro ? s.planBadgePro : s.planBadgeFree]}>
            <Text style={[s.planBadgeText, isPro ? s.planBadgeTextPro : s.planBadgeTextFree]}>
              {isPro ? t('profile.proPlan') : t('profile.freePlan')}
            </Text>
          </View>
        </View>
      </View>

      {/* Usage */}
      <Text style={s.sectionHeader}>{t('profile.sectionUsage')}</Text>
      <View style={s.usageCard}>
        <View style={s.usageHeaderRow}>
          <Text style={s.usageTitle}>{t('profile.monthlyUsage')}</Text>
          {entitlement && (
            <Text style={s.usageReset}>
              {t('profile.resetsOn', { date: formatReset(entitlement.resets_at, language) })}
            </Text>
          )}
        </View>
        <UsageBar pct={pct} color={barColor} trackColor={colors.border} />
        <View style={s.usageBottomRow}>
          <Text style={s.usageBottomText}>
            {t('profile.minUsed', { used: entitlement ? Math.round(entitlement.minutes_used) : 0 })}
          </Text>
          <Text style={s.usageBottomText}>
            {t('profile.of', { limit: entitlement ? entitlement.minutes_limit : 0 })}
          </Text>
        </View>
      </View>

      {/* Upgrade */}
      {entitlement && !isPro && (
        <>
          <Text style={s.sectionHeader}>{t('profile.sectionPro')}</Text>
          <View style={s.upgradeCard}>
            <View style={s.upgradeHeaderRow}>
              <Text style={s.upgradeTitle}>{t('profile.upgradeTitle')}</Text>
              <View style={s.upgradePill}>
                <Text style={s.upgradePillText}>{t('profile.upgradePill')}</Text>
              </View>
            </View>
            <Text style={s.upgradeSubtitle}>{t('profile.upgradeSubtitle')}</Text>
            <Text style={s.upgradePrice}>{t('profile.upgradePrice')}</Text>
            <TouchableOpacity
              style={s.upgradeButton}
              onPress={() => Alert.alert(t('profile.upgradeComingSoon'), t('profile.upgradeComingSoonBody'))}
            >
              <Text style={s.upgradeButtonText}>{t('profile.upgradeButton')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* App */}
      <Text style={s.sectionHeader}>{t('profile.sectionApp')}</Text>
      <RowItem
        label={t('profile.language')}
        rightText={t('profile.languageValue')}
        onPress={() => setLanguage(language === 'en' ? 'tr' : 'en')}
        colors={colors}
      />
      <RowItem
        label={t('profile.appearance')}
        rightText={theme === 'dark' ? t('profile.appearanceDark') : t('profile.appearanceLight')}
        onPress={toggleTheme}
        colors={colors}
      />

      {/* Legal */}
      <Text style={s.sectionHeader}>{t('profile.sectionLegal')}</Text>
      <RowItem label={t('profile.privacyPolicy')} onPress={() => openLink('https://summarex.app/privacy')} colors={colors} />
      <RowItem label={t('profile.terms')} onPress={() => openLink('https://summarex.app/terms')} colors={colors} />
      <RowItem label={t('profile.contact')} onPress={() => openLink('https://summarex.app/contact')} colors={colors} />

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Text style={s.signOutText}>{t('profile.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
