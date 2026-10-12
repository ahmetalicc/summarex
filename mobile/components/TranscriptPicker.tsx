import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { hapticImpact } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, Radius } from '@/constants/tokens';
import { Button, Card, Badge, Eyebrow } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting } from '@/lib/api';

type Styles = ReturnType<typeof createStyles>;

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SkeletonRow({ s, color }: { s: Styles; color: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={s.skeletonRow}>
      <Animated.View style={[s.skeletonIcon, { backgroundColor: color }, pulse]} />
      <View style={{ flex: 1, gap: 8 }}>
        <Animated.View style={[s.skeletonLine, { width: '70%', backgroundColor: color }, pulse]} />
        <Animated.View style={[s.skeletonLine, { width: '40%', height: 10, backgroundColor: color }, pulse]} />
      </View>
      <Animated.View style={[s.skeletonButton, { backgroundColor: color }, pulse]} />
    </View>
  );
}

/**
 * "Summarize an existing transcript" section for the Summarize tab. Collapsible,
 * because the screen above it (RecordUploadView) owns its own full-height scroll
 * and can't host extra content in the same scroll view.
 */
export function TranscriptPicker() {
  const router = useRouter();
  const { colors, language } = useTheme();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await api.meetings.list({ limit: 50 });
      if (id !== requestId.current) return;
      setMeetings(data.filter((m) => m.status === 'transcribed'));
      setLoadFailed(false);
    } catch {
      if (id !== requestId.current) return;
      setLoadFailed(true);
    }
  }, []);

  // Refresh whenever the tab gains focus (e.g. after transcribing something).
  useFocusEffect(
    useCallback(() => {
      load();
      return () => { requestId.current++; };
    }, [load])
  );

  function retry() {
    setMeetings(null);
    setLoadFailed(false);
    load();
  }

  async function summarize(meeting: Meeting) {
    if (busyId) return;
    setBusyId(meeting.id);
    setActionError(null);
    try {
      await api.meetings.regenerateSummary(meeting.id);
      setMeetings((prev) => prev?.filter((m) => m.id !== meeting.id) ?? prev);
      router.push(`/meeting/${meeting.id}` as never);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      setActionError(status === 429 ? t('summarize.pickerRateLimited') : t('summarize.pickerActionError'));
    } finally {
      setBusyId(null);
    }
  }

  const count = meetings?.length ?? 0;
  const loading = meetings === null && !loadFailed;

  function renderBody() {
    if (loading) {
      return (
        <View style={s.list}>
          {[0, 1].map((i) => <SkeletonRow key={i} s={s} color={colors.bgElevated} />)}
        </View>
      );
    }

    if (loadFailed && meetings === null) {
      return (
        <View style={s.stateBox}>
          <Ionicons name="cloud-offline-outline" size={24} color={colors.error} />
          <Text style={s.stateText}>{t('summarize.pickerLoadError')}</Text>
          <Button label={t('common.retry')} variant="secondary" size="sm" leftIcon="refresh-outline" onPress={retry} />
        </View>
      );
    }

    if (count === 0) {
      return (
        <View style={s.stateBox}>
          <Text style={s.stateText}>{t('summarize.pickerEmpty')}</Text>
        </View>
      );
    }

    return (
      <View style={s.list}>
        {meetings!.map((m) => (
          <Card key={m.id} padding={Spacing.md}>
            <View style={s.row}>
              <View style={s.rowIcon}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {m.title || t('recordings.untitled')}
                </Text>
                <Text style={s.rowMeta} numberOfLines={1}>
                  {m.created_at ? formatDate(m.created_at, language) : '—'} · {formatDuration(m.duration_seconds)}
                </Text>
              </View>
              <Button
                label={t('summarize.pickerAction')}
                size="sm"
                leftIcon="sparkles-outline"
                onPress={() => summarize(m)}
                isLoading={busyId === m.id}
                disabled={busyId !== null}
              />
            </View>
          </Card>
        ))}
        {actionError && <Text style={s.errorText}>{actionError}</Text>}
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Pressable
        style={s.header}
        onPress={() => { hapticImpact(); setExpanded((v) => !v); }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t('summarize.pickerTitle')}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>{t('summarize.pickerEyebrow')}</Eyebrow>
          <Text style={s.title} numberOfLines={2}>{t('summarize.pickerTitle')}</Text>
        </View>
        {count > 0 && <Badge label={String(count)} variant="info" />}
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={20} color={colors.textMuted} />
      </Pressable>

      {expanded && (
        <ScrollView
          style={{ maxHeight: windowHeight * 0.42 }}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.subtitle}>{t('summarize.pickerSubtitle')}</Text>
          {renderBody()}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    wrap: {
      borderTopWidth: 1, borderTopColor: colors.border,
      backgroundColor: colors.bg,
      paddingHorizontal: Spacing.lg,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: Spacing.md,
    },
    title: { fontFamily: Fonts.display, fontSize: 18, letterSpacing: -0.3, color: colors.text },
    body: { paddingBottom: Spacing.md, gap: Spacing.sm },
    subtitle: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },

    list: { gap: Spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    rowIcon: {
      width: 40, height: 40, borderRadius: Radius.md,
      backgroundColor: `rgba(${colors.primaryRgb}, 0.14)`,
      alignItems: 'center', justifyContent: 'center',
    },
    rowTitle: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: colors.text },
    rowMeta: { fontFamily: Fonts.mono, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    errorText: { fontFamily: Fonts.body, fontSize: 13, color: colors.error },

    stateBox: {
      alignItems: 'center', gap: Spacing.sm,
      borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: Radius.xl,
      paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    },
    stateText: {
      fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center', color: colors.textMuted,
    },

    skeletonRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.bgSurface, borderRadius: Radius['2xl'],
      borderWidth: 1, borderColor: colors.border, padding: Spacing.md,
    },
    skeletonIcon: { width: 40, height: 40, borderRadius: Radius.md },
    skeletonLine: { height: 14, borderRadius: 7 },
    skeletonButton: { width: 84, height: 36, borderRadius: Radius.full },
  });
}
