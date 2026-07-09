import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { hapticImpact } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, TAB_BAR_OFFSET } from '@/constants/tokens';
import { AppHeader } from '@/components/AppHeader';
import { Card, Badge, Eyebrow, Button } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';
import type { Entitlement } from '@/lib/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function formatReset(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function Segmented<T extends string>({
  options, value, onChange, s, colors,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  s: Styles;
  colors: ColorScheme;
}) {
  return (
    <View style={s.segmented}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[s.segment, active && s.segmentActive]}
            onPress={() => { if (!active) { hapticImpact(); onChange(opt.key); } }}
          >
            <Text style={[s.segmentText, { color: active ? colors.primary : colors.textMuted }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LinkRow({ label, onPress, s, colors, last }: {
  label: string; onPress: () => void; s: Styles; colors: ColorScheme; last?: boolean;
}) {
  return (
    <Pressable style={[s.row, !last && s.rowBorder]} onPress={onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function UsageBar({ pct, color, trackColor }: { pct: number; color: string; trackColor: string }) {
  const width = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      width.value = 0;
      width.value = withDelay(300, withSpring(pct, { damping: 20, stiffness: 120 }));
    }, [pct, width])
  );
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return (
    <View style={{ marginTop: Spacing.sm, height: 6, borderRadius: 3, backgroundColor: trackColor, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, fillStyle]} />
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, theme, toggleTheme, language, setLanguage } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const s = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)).catch(() => {});
    api.entitlement.me().then(setEntitlement).catch(() => {});
  }, []);

  function handleSignOut() {
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: async () => { await supabase.auth.signOut(); } },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(t('profile.deleteAccountConfirmTitle'), t('profile.deleteAccountConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteAccountConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.user.deleteAccount();
            // Signing out flips the auth session; the root layout redirects to auth.
            await supabase.auth.signOut();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), (e as Error).message || t('profile.deleteAccountError'));
          }
        },
      },
    ]);
  }

  function openLink(url: string) { WebBrowser.openBrowserAsync(url); }

  const isPro = entitlement?.tier === 'pro';
  const pct = entitlement ? Math.min(100, (entitlement.minutes_used / entitlement.minutes_limit) * 100) : 0;
  const barColor = pct > 90 ? colors.error : pct >= 70 ? colors.accent : colors.primary;
  const initial = email ? email.charAt(0).toUpperCase() : '?';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  function setThemeMode(next: 'dark' | 'light') {
    if (next !== theme) toggleTheme();
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <AppHeader eyebrow={t('tabs.settings')} title={t('profile.title')} />

        {/* Profile */}
        <View style={s.section}>
          <Card>
            <View style={s.profileRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Eyebrow>{t('profile.sectionAccount')}</Eyebrow>
                <Text style={s.email} numberOfLines={1}>{email ?? ''}</Text>
                <View style={{ marginTop: 6 }}>
                  <Badge label={isPro ? t('profile.proPlan') : t('profile.freePlan')} variant={isPro ? 'info' : 'neutral'} />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Usage */}
        <Eyebrow style={s.sectionLabel}>{t('profile.sectionUsage')}</Eyebrow>
        <Card>
          <View style={s.usageHeaderRow}>
            <Text style={s.usageTitle}>{t('profile.monthlyUsage')}</Text>
            {entitlement && (
              <Text style={s.usageReset}>{t('profile.resetsOn', { date: formatReset(entitlement.resets_at, language) })}</Text>
            )}
          </View>
          <UsageBar pct={pct} color={barColor} trackColor={colors.bgElevated} />
          <View style={s.usageBottomRow}>
            <Text style={s.usageBottomText}>{t('profile.minUsed', { used: entitlement ? Math.round(entitlement.minutes_used) : 0 })}</Text>
            <Text style={s.usageBottomText}>{t('profile.of', { limit: entitlement ? entitlement.minutes_limit : 0 })}</Text>
          </View>
        </Card>

        {/* Upgrade */}
        {entitlement && !isPro && (
          <View style={{ marginTop: Spacing.md }}>
            <Card gradient>
              <View style={s.upgradeHeaderRow}>
                <Text style={s.upgradeTitle}>{t('profile.upgradeTitle')}</Text>
                <Badge label={t('profile.upgradePill')} variant="info" />
              </View>
              <Text style={s.upgradeSubtitle}>{t('profile.upgradeSubtitle')}</Text>
              <Text style={s.upgradePrice}>{t('profile.upgradePrice')}</Text>
              <View style={{ marginTop: Spacing.md }}>
                <Button
                  label={t('profile.upgradeButton')}
                  variant="primary"
                  fullWidth
                  onPress={() => Alert.alert(t('profile.upgradeComingSoon'), t('profile.upgradeComingSoonBody'))}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Preferences */}
        <Eyebrow style={s.sectionLabel}>{t('profile.sectionPreferences')}</Eyebrow>
        <Card>
          <View style={[s.prefRow, s.rowBorder]}>
            <Text style={s.rowLabel}>{t('profile.language')}</Text>
            <Segmented
              options={[{ key: 'en', label: 'EN' }, { key: 'tr', label: 'TR' }]}
              value={language}
              onChange={setLanguage}
              s={s}
              colors={colors}
            />
          </View>
          <View style={s.prefRow}>
            <Text style={s.rowLabel}>{t('profile.theme')}</Text>
            <Segmented
              options={[{ key: 'dark', label: t('profile.appearanceDark') }, { key: 'light', label: t('profile.appearanceLight') }]}
              value={theme}
              onChange={setThemeMode}
              s={s}
              colors={colors}
            />
          </View>
        </Card>

        {/* App / Legal */}
        <Eyebrow style={s.sectionLabel}>{t('profile.sectionApp')}</Eyebrow>
        <Card padding={0}>
          <View style={s.versionRow}>
            <Text style={s.rowLabel}>{t('common.brand')}</Text>
            <Text style={s.versionText}>v{version}</Text>
          </View>
          <View style={s.rowBorder} />
          <LinkRow label={t('profile.privacyPolicy')} onPress={() => openLink('https://summarex.app/privacy')} s={s} colors={colors} />
          <LinkRow label={t('profile.terms')} onPress={() => openLink('https://summarex.app/terms')} s={s} colors={colors} />
          <LinkRow label={t('profile.contact')} onPress={() => openLink('https://summarex.app/contact')} s={s} colors={colors} last />
        </Card>

        {/* Sign out */}
        <View style={{ marginTop: Spacing.xl }}>
          <Button label={t('profile.signOut')} variant="secondary" fullWidth leftIcon="log-out-outline" onPress={handleSignOut} />
        </View>

        {/* Danger zone */}
        <Pressable style={s.deleteRow} onPress={handleDeleteAccount} hitSlop={{ top: 8, bottom: 8 }}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={s.deleteText}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: TAB_BAR_OFFSET },

    section: { marginTop: Spacing.lg },
    sectionLabel: { marginTop: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: Spacing.xxs },

    profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    avatar: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 20, fontFamily: Fonts.display, color: colors.primary },
    email: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text, marginTop: 4 },

    usageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    usageTitle: { fontSize: 15, fontFamily: Fonts.displaySemiBold, color: colors.text },
    usageReset: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted },
    usageBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
    usageBottomText: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted },

    upgradeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    upgradeTitle: { fontSize: 18, fontFamily: Fonts.display, color: colors.text },
    upgradeSubtitle: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, marginTop: Spacing.xs },
    upgradePrice: { fontSize: 24, fontFamily: Fonts.display, color: colors.primary, marginTop: Spacing.sm },

    prefRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
    },
    rowLabel: { fontSize: 15, fontFamily: Fonts.bodyMedium, color: colors.text },

    segmented: {
      flexDirection: 'row', gap: 4,
      backgroundColor: colors.bgElevated,
      borderRadius: 999, padding: 3,
    },
    segment: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
      borderWidth: 1, borderColor: 'transparent',
    },
    segmentActive: { backgroundColor: colors.bgSurface, borderColor: colors.primary },
    segmentText: { fontSize: 12, fontFamily: Fonts.monoMedium, letterSpacing: 0.5 },

    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: 16,
    },
    versionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: 16,
    },
    versionText: { fontSize: 13, fontFamily: Fonts.mono, color: colors.textMuted },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

    deleteRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: Spacing.md, paddingVertical: Spacing.sm,
    },
    deleteText: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.error },
  });
}

type Styles = ReturnType<typeof createStyles>;
