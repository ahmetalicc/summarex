import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, Alert, TextInput, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { hapticImpact } from '@/lib/haptics';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';
import { Brand } from '@/components/Brand';
import type { Meeting, MeetingStatus } from '@/lib/api';

const STATUS_KEY: Record<MeetingStatus, string> = {
  queued: 'recordings.statusQueued',
  transcribing: 'recordings.statusTranscribing',
  transcribed: 'recordings.statusTranscribed',
  summarizing: 'recordings.statusSummarizing',
  done: 'recordings.statusDone',
  error: 'recordings.statusError',
};

function statusColors(colors: ColorScheme): Record<MeetingStatus, string> {
  return {
    queued: colors.textMuted,
    transcribing: colors.accent,
    transcribed: colors.primary,
    summarizing: colors.accent,
    done: colors.success,
    error: colors.error,
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Styles = ReturnType<typeof createStyles>;

function MeetingCard({
  meeting, statusColor, statusLabel, meta, onPress, s,
}: {
  meeting: Meeting;
  statusColor: string;
  statusLabel: string;
  meta: string;
  onPress: () => void;
  s: Styles;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={s.card}
        onPress={() => {
          hapticImpact();
          onPress();
        }}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      >
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {meeting.title || t('recordings.untitled')}
          </Text>
          <Text style={s.cardMeta}>{meta}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: statusColor + '18' }]}>
          <Text style={[s.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SkeletonCard({ s, skeletonColor }: { s: Styles; skeletonColor: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withTiming(0.4, { duration: 600 })
      ),
      -1
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={s.card}>
      <View style={s.cardBody}>
        <Animated.View style={[s.skeletonTitle, { backgroundColor: skeletonColor }, pulse]} />
        <Animated.View style={[s.skeletonMeta, { backgroundColor: skeletonColor }, pulse]} />
      </View>
      <Animated.View style={[s.skeletonPill, { backgroundColor: skeletonColor }, pulse]} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, language } = useTheme();
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const STATUS_COLOR = useMemo(() => statusColors(colors), [colors]);
  const s = useMemo(() => createStyles(colors), [colors]);

  async function load(isRefresh = false, q = search) {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.meetings.list({ limit: 50, search: q || undefined });
      setMeetings(data);
    } catch (e: unknown) {
      if (!isRefresh) Alert.alert(t('common.error'), (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    const hasInProgress = meetings.some(
      (m) => m.status === 'queued' || m.status === 'transcribing' || m.status === 'summarizing'
    );
    if (!hasInProgress) return;
    const timer = setInterval(() => load(), 5000);
    return () => clearInterval(timer);
  }, [meetings]);

  useEffect(() => {
    const timer = setTimeout(() => load(false, search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function renderBody() {
    if (loading) {
      return (
        <View style={s.skeletonList}>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} s={s} skeletonColor={colors.bgElevated} />
          ))}
        </View>
      );
    }

    if (meetings.length === 0) {
      return (
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="mic-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>{t('recordings.emptyTitle')}</Text>
          <View style={s.emptySubtitleWrap}>
            <Text style={s.emptySubtitle}>{t('recordings.emptySubtitle')}</Text>
          </View>
          <View style={s.emptyCtaRow}>
            <Pressable style={s.emptyCtaPrimary} onPress={() => router.push('/(tabs)/transcribe')}>
              <Ionicons name="document-text-outline" size={14} color="#fff" />
              <Text style={s.emptyCtaPrimaryText}>{t('tabs.transcribe')}</Text>
            </Pressable>
            <Pressable style={s.emptyCtaSecondary} onPress={() => router.push('/(tabs)/summarize')}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={s.emptyCtaSecondaryText}>{t('tabs.summarize')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <FlashList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={s.sectionHeader}>{t('recordings.recentTitle')}</Text>
        }
        renderItem={({ item }) => (
          <MeetingCard
            meeting={item}
            statusColor={STATUS_COLOR[item.status]}
            statusLabel={t(STATUS_KEY[item.status])}
            meta={`${formatDate(item.created_at, language)}${item.duration_seconds ? `  ·  ${formatDuration(item.duration_seconds)}` : ''}`}
            onPress={() => router.push(`/meeting/${item.id}` as never)}
            s={s}
          />
        )}
      />
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.brandRow}>
          <Brand size="md" />
        </View>
        <Text style={s.tagline}>{t('common.tagline')}</Text>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder={t('recordings.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
        </View>
      </View>

      {renderBody()}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: {
      paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    brandRow: { alignItems: 'center' },
    tagline: {
      fontFamily: Fonts.body, fontSize: 13, color: colors.textMuted,
      textAlign: 'center', marginTop: 4,
    },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginTop: 16,
      backgroundColor: colors.bg,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14,
    },
    searchInput: {
      flex: 1, paddingVertical: 11,
      fontSize: 15, fontFamily: Fonts.body, color: colors.text,
    },

    sectionHeader: {
      fontFamily: Fonts.displaySemiBold, fontSize: 13, color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      paddingHorizontal: 4, paddingTop: 20, paddingBottom: 10,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },

    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderRadius: 16, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    statusDot: {
      width: 8, height: 8, borderRadius: 4, marginRight: 10,
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: Fonts.displaySemiBold, color: colors.text },
    cardMeta: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 3 },
    statusPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
      marginLeft: 8,
    },
    statusPillText: {
      fontSize: 10, fontFamily: Fonts.bodyMedium, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.3,
    },

    skeletonList: { paddingHorizontal: 16, paddingTop: 20 },
    skeletonTitle: { height: 14, width: '60%', borderRadius: 7 },
    skeletonMeta: { height: 10, width: '40%', borderRadius: 5, marginTop: 8 },
    skeletonPill: { height: 18, width: 60, borderRadius: 99, marginLeft: 8 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
    emptyIconWrap: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary + '10',
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: 18, fontFamily: Fonts.display, color: colors.text,
      textAlign: 'center', marginTop: 20,
    },
    emptySubtitleWrap: { maxWidth: 260, alignItems: 'center' },
    emptySubtitle: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', lineHeight: 22, marginTop: 8,
    },
    emptyCtaRow: {
      flexDirection: 'row', gap: 10, marginTop: 28, paddingHorizontal: 32,
    },
    emptyCtaPrimary: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: colors.primary, borderRadius: 12,
      paddingHorizontal: 20, paddingVertical: 13,
    },
    emptyCtaPrimaryText: { fontFamily: Fonts.displaySemiBold, fontSize: 14, color: '#fff' },
    emptyCtaSecondary: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent',
      borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13,
    },
    emptyCtaSecondaryText: { fontFamily: Fonts.displaySemiBold, fontSize: 14, color: colors.primary },
  });
}
