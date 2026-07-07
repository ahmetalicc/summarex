import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  withRepeat, withSequence, cancelAnimation, FadeInDown,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, MeetingStatus } from '@/lib/api';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_KEY: Record<MeetingStatus, string> = {
  queued: 'recordings.statusQueued',
  transcribing: 'recordings.statusTranscribing',
  transcribed: 'recordings.statusTranscribed',
  summarizing: 'recordings.statusSummarizing',
  done: 'recordings.statusDone',
  error: 'recordings.statusError',
};

const STATUS_ICON: Record<MeetingStatus, IoniconsName> = {
  queued: 'time-outline',
  transcribing: 'time-outline',
  transcribed: 'sparkles',
  summarizing: 'time-outline',
  done: 'sparkles',
  error: 'alert-circle-outline',
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

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'recordings.goodMorning';
  if (hour < 17) return 'recordings.goodAfternoon';
  return 'recordings.goodEvening';
}

type Styles = ReturnType<typeof createStyles>;

const IN_PROGRESS_STATUSES: MeetingStatus[] = ['queued', 'transcribing', 'summarizing'];

function MeetingCard({
  meeting, statusColor, meta, onPress, s, colors,
}: {
  meeting: Meeting;
  statusColor: string;
  statusLabel: string;
  meta: string;
  onPress: () => void;
  s: Styles;
  colors: ColorScheme;
}) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const duration = formatDuration(meeting.duration_seconds);

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
        <View style={s.cardTopRow}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {meeting.title || t('recordings.untitled')}
          </Text>
          <View style={[s.cardModeIcon, { backgroundColor: statusColor + '18' }]}>
            <Ionicons name={STATUS_ICON[meeting.status]} size={16} color={statusColor} />
          </View>
        </View>
        <View style={s.cardBottomRow}>
          <Text style={s.cardDate}>{meta}</Text>
          {duration !== '' && (
            <View style={s.cardDuration}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={s.cardDurationText}>{duration}</Text>
            </View>
          )}
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
      <View style={s.cardTopRow}>
        <Animated.View style={[s.skeletonTitle, { backgroundColor: skeletonColor }, pulse]} />
        <Animated.View style={[s.skeletonIcon, { backgroundColor: skeletonColor }, pulse]} />
      </View>
      <Animated.View style={[s.skeletonMeta, { backgroundColor: skeletonColor }, pulse]} />
    </View>
  );
}

function StatCard({
  icon, value, label, s, colors,
}: {
  icon: IoniconsName;
  value: string;
  label: string;
  s: Styles;
  colors: ColorScheme;
}) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
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
  const [userInitial, setUserInitial] = useState('?');
  const hasAnimated = useRef(false);

  const STATUS_COLOR = useMemo(() => statusColors(colors), [colors]);
  const s = useMemo(() => createStyles(colors), [colors]);

  const totalHours = useMemo(
    () => (meetings.reduce((acc, m) => acc + (m.duration_seconds ?? 0), 0) / 3600).toFixed(1),
    [meetings]
  );

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
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      setUserInitial(email?.[0]?.toUpperCase() ?? '?');
    });
  }, []);

  // Stagger the card entry animation only on the first data load —
  // re-animating on every refresh is jarring.
  useEffect(() => {
    if (!loading && meetings.length > 0) hasAnimated.current = true;
  }, [loading, meetings]);

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
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeader}>{t('recordings.recentTitle')}</Text>
            <Text style={s.seeAll}>{t('recordings.seeAll')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={hasAnimated.current ? undefined : FadeInDown.delay(index * 80).duration(500).springify().damping(14)}
          >
            <MeetingCard
              meeting={item}
              statusColor={STATUS_COLOR[item.status]}
              statusLabel={t(STATUS_KEY[item.status])}
              meta={formatDate(item.created_at, language)}
              onPress={() => router.push(`/meeting/${item.id}` as never)}
              s={s}
              colors={colors}
            />
          </Animated.View>
        )}
      />
    );
  }

  return (
    <View style={s.container}>
      <Animated.View entering={FadeInDown.duration(400).springify()}>
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text>
              <Text style={s.brandText}>{'Summa'}</Text>
              <Text style={[s.brandText, { color: colors.primary }]}>{'rex'}</Text>
            </Text>
            <Pressable style={s.avatar} onPress={() => router.push('/(tabs)/settings')}>
              <Text style={s.avatarText}>{userInitial}</Text>
            </Pressable>
          </View>
          <Text style={s.greeting}>{t(greetingKey())}</Text>
          <Text style={s.headerTitle}>{t('recordings.title')}</Text>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
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

        <View style={s.statsRow}>
          <StatCard icon="grid-outline" value={meetings.length.toString()} label={t('recordings.statsTotal')} s={s} colors={colors} />
          <StatCard icon="time-outline" value={totalHours} label={t('recordings.statsHours')} s={s} colors={colors} />
          <StatCard icon="globe-outline" value="1" label={t('recordings.statsLanguages')} s={s} colors={colors} />
        </View>
      </Animated.View>

      {renderBody()}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: {
      paddingTop: 56, paddingBottom: 0, paddingHorizontal: 20,
      backgroundColor: colors.bg,
    },
    headerTop: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    brandText: {
      fontFamily: Fonts.display,
      fontSize: 17,
      color: colors.text,
    },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16, fontFamily: Fonts.displaySemiBold, color: '#fff',
    },
    greeting: {
      fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted,
      marginTop: 20,
    },
    headerTitle: {
      fontFamily: Fonts.display,
      fontSize: 28,
      color: colors.text,
      letterSpacing: -0.5,
      marginTop: 2,
    },

    searchBar: {
      marginTop: 16, marginHorizontal: 20, marginBottom: 16,
      backgroundColor: colors.bgSurface,
      borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: Fonts.body, fontSize: 15,
      color: colors.text,
      padding: 0,
    },

    statsRow: {
      flexDirection: 'row', marginHorizontal: 20, gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.bgSurface,
      borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      paddingVertical: 14, paddingHorizontal: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22, fontFamily: Fonts.display, color: colors.text, marginTop: 4,
    },
    statLabel: {
      fontSize: 11, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 2,
    },

    sectionHeaderRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    sectionHeader: {
      fontFamily: Fonts.displaySemiBold, fontSize: 13, color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      paddingHorizontal: 4, paddingTop: 20, paddingBottom: 10,
    },
    seeAll: {
      fontSize: 13, fontFamily: Fonts.body, color: colors.primary,
      paddingHorizontal: 4, paddingTop: 20, paddingBottom: 10,
    },
    listContent: { paddingHorizontal: 20, paddingBottom: 24 },

    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: 18, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTopRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    },
    cardTitle: { flex: 1, fontSize: 15, fontFamily: Fonts.displaySemiBold, color: colors.text },
    cardModeIcon: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    cardBottomRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 8,
    },
    cardDate: { fontSize: 11, fontFamily: Fonts.body, color: colors.textMuted },
    cardDuration: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    cardDurationText: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },

    skeletonList: { paddingHorizontal: 20, paddingTop: 20 },
    skeletonTitle: { height: 14, width: '60%', borderRadius: 7 },
    skeletonIcon: { width: 32, height: 32, borderRadius: 10 },
    skeletonMeta: { height: 10, width: '40%', borderRadius: 5, marginTop: 10 },

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
