import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation, FadeInDown,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { hapticImpact } from '@/lib/haptics';
import { displayTitle } from '@/lib/meetingTitle';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, TAB_BAR_OFFSET } from '@/constants/tokens';
import { Brand } from '@/components/Brand';
import { AppHeader } from '@/components/AppHeader';
import { Button, Card, Input, Badge, EmptyState, Eyebrow } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, MeetingStatus } from '@/lib/api';

const PAGE_SIZE = 50;
const POLL_MS = 5000;
const IN_PROGRESS = new Set<MeetingStatus>(['queued', 'transcribing', 'summarizing']);

type BadgeVariant = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'error';

const STATUS_KEY: Record<MeetingStatus, string> = {
  queued: 'recordings.statusQueued',
  transcribing: 'recordings.statusTranscribing',
  transcribed: 'recordings.statusTranscribed',
  summarizing: 'recordings.statusSummarizing',
  done: 'recordings.statusDone',
  error: 'recordings.statusError',
};

const STATUS_VARIANT: Record<MeetingStatus, BadgeVariant> = {
  queued: 'neutral',
  transcribing: 'warning',
  transcribed: 'info',
  summarizing: 'warning',
  done: 'success',
  error: 'error',
};

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
  meeting, statusLabel, statusVariant, meta, onPress, onLongPress, onDelete, s, colors,
}: {
  meeting: Meeting;
  statusLabel: string;
  statusVariant: BadgeVariant;
  meta: string;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  s: Styles;
  colors: ColorScheme;
}) {
  const { t } = useTranslation();
  const duration = formatDuration(meeting.duration_seconds);

  return (
    <View style={s.cardWrap}>
      <Card pressable onPress={onPress} onLongPress={onLongPress}>
        <View style={s.cardTopRow}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {displayTitle(meeting.title, t)}
          </Text>
          <Badge label={statusLabel} variant={statusVariant} />
        </View>
        <View style={s.cardBottomRow}>
          <Text style={s.cardDate}>{meta}</Text>
          <View style={s.cardBottomRight}>
            {duration !== '' && <Text style={s.cardDuration}>{duration}</Text>}
            <Pressable
              onPress={onDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('recordings.deleteRecording')}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </Card>
    </View>
  );
}

function SkeletonCard({ s, skeletonColor }: { s: Styles; skeletonColor: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ),
      -1
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={s.cardWrap}>
      <View style={s.skeletonCard}>
        <View style={s.cardTopRow}>
          <Animated.View style={[s.skeletonTitle, { backgroundColor: skeletonColor }, pulse]} />
          <Animated.View style={[s.skeletonBadge, { backgroundColor: skeletonColor }, pulse]} />
        </View>
        <Animated.View style={[s.skeletonMeta, { backgroundColor: skeletonColor }, pulse]} />
      </View>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState('');
  // Debounced, trimmed copy of `search`; this is what the list is loaded for.
  const [query, setQuery] = useState('');
  const hasAnimated = useRef(false);

  // Refs mirror state that async callbacks need the latest value of.
  const meetingsRef = useRef<Meeting[]>([]);
  const queryRef = useRef('');
  const loadedQueryRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  queryRef.current = query;

  const s = useMemo(() => createStyles(colors), [colors]);

  const commit = useCallback((list: Meeting[]) => {
    meetingsRef.current = list;
    setMeetings(list);
  }, []);

  // 'initial' covers mount, refocus, query change and Retry; 'refresh' is
  // pull-to-refresh; 'poll' is the silent status refresh while jobs run.
  const loadFirst = useCallback(async (q: string, mode: 'initial' | 'refresh' | 'poll') => {
    const poll = mode === 'poll';
    // Polls don't claim the request slot, so they never cancel a user-driven load
    // (but are dropped if one starts while they're in flight).
    const seq = poll ? requestRef.current : ++requestRef.current;
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial' && meetingsRef.current.length === 0) setLoading(true);
    try {
      const page = await api.meetings.list({ limit: PAGE_SIZE, search: q || undefined });
      if (seq !== requestRef.current) return;
      if (poll) {
        // Refresh the first page in place without discarding pages loaded via "load more".
        const ids = new Set(page.map((m) => m.id));
        const merged = [...page, ...meetingsRef.current.slice(PAGE_SIZE).filter((m) => !ids.has(m.id))];
        commit(merged);
        if (merged.length <= PAGE_SIZE) setHasMore(page.length === PAGE_SIZE);
      } else {
        commit(page);
        setHasMore(page.length === PAGE_SIZE);
        setLoadMoreFailed(false);
        setError(false);
        loadedQueryRef.current = q;
      }
    } catch {
      if (poll || seq !== requestRef.current) return;
      // Don't leave results from a previous search on screen under an error.
      if (loadedQueryRef.current !== q) commit([]);
      setError(true);
    } finally {
      if (seq === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [commit]);

  async function loadMore() {
    if (loadingMoreRef.current || !hasMore || loading || refreshing || error) return;
    const seq = requestRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await api.meetings.list({
        limit: PAGE_SIZE,
        offset: meetingsRef.current.length,
        search: queryRef.current || undefined,
      });
      if (seq !== requestRef.current) return; // the list was reloaded meanwhile
      const ids = new Set(meetingsRef.current.map((m) => m.id));
      commit([...meetingsRef.current, ...page.filter((m) => !ids.has(m.id))]);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      if (seq === requestRef.current) setLoadMoreFailed(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  // Single entry point for fetching: runs on mount, whenever the tab regains
  // focus, and when the debounced query changes (the callback identity changes).
  useFocusEffect(useCallback(() => {
    setFocused(true);
    loadFirst(query, 'initial');
    return () => setFocused(false);
  }, [query, loadFirst]));

  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const timer = setTimeout(() => setQuery(next), 300);
    return () => clearTimeout(timer);
  }, [search, query]);

  useEffect(() => {
    if (!loading && meetings.length > 0) hasAnimated.current = true;
  }, [loading, meetings]);

  const hasInProgress = useMemo(() => meetings.some((m) => IN_PROGRESS.has(m.status)), [meetings]);

  // Poll only while this tab is focused and something is still processing.
  useEffect(() => {
    if (!focused || !hasInProgress) return;
    const timer = setInterval(() => loadFirst(queryRef.current, 'poll'), POLL_MS);
    return () => clearInterval(timer);
  }, [focused, hasInProgress, loadFirst]);

  function confirmDelete(meeting: Meeting) {
    Alert.alert(t('meeting.deleteTitle'), t('meeting.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.meetings.delete(meeting.id);
            commit(meetingsRef.current.filter((m) => m.id !== meeting.id));
          } catch (e: unknown) {
            Alert.alert(t('common.error'), (e as Error).message);
          }
        },
      },
    ]);
  }

  function renderBody() {
    if (loading) {
      return (
        <View style={s.skeletonList}>
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonCard key={i} s={s} skeletonColor={colors.bgElevated} />
          ))}
        </View>
      );
    }

    if (meetings.length === 0 && error) {
      return (
        <View style={s.emptyWrap}>
          <EmptyState
            icon="cloud-offline-outline"
            title={t('recordings.loadErrorTitle')}
            subtitle={t('errors.network')}
            actionLabel={t('common.retry')}
            actionIcon="refresh-outline"
            onAction={() => loadFirst(query, 'initial')}
          />
        </View>
      );
    }

    if (meetings.length === 0 && query !== '') {
      return (
        <View style={s.emptyWrap}>
          <EmptyState
            icon="search-outline"
            title={t('recordings.emptySearchTitle')}
            subtitle={t('recordings.emptySearchSubtitle')}
            actionLabel={t('recordings.clearSearch')}
            actionIcon="close-circle-outline"
            onAction={() => { setSearch(''); setQuery(''); }}
          />
        </View>
      );
    }

    if (meetings.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <EmptyState
            icon="mic-outline"
            tone="accent"
            title={t('recordings.emptyTitle')}
            subtitle={t('recordings.emptySubtitle')}
            actionLabel={t('newRecording.startRecording')}
            actionIcon="sparkles-outline"
            onAction={() => router.push('/(tabs)/summarize')}
          />
        </View>
      );
    }

    return (
      <FlashList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFirst(query, 'refresh')}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                <Text style={s.errorBannerText}>{t('recordings.loadErrorTitle')}</Text>
                <Pressable onPress={() => loadFirst(query, 'initial')} hitSlop={8}>
                  <Text style={s.errorBannerAction}>{t('common.retry')}</Text>
                </Pressable>
              </View>
            )}
            <View style={s.sectionHeaderRow}>
              <Eyebrow>{t('recordings.recentTitle')}</Eyebrow>
              <Text style={s.sectionCount}>{meetings.length}{hasMore ? '+' : ''}</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={s.footer}><ActivityIndicator color={colors.primary} /></View>
          ) : loadMoreFailed ? (
            <View style={s.footer}>
              <Button label={t('recordings.loadMore')} variant="secondary" size="sm" onPress={loadMore} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={hasAnimated.current ? undefined : FadeInDown.delay(index * 60).duration(400).springify().damping(16)}
          >
            <MeetingCard
              meeting={item}
              statusLabel={t(STATUS_KEY[item.status])}
              statusVariant={STATUS_VARIANT[item.status]}
              meta={formatDate(item.created_at, language)}
              onPress={() => router.push(`/meeting/${item.id}` as never)}
              onLongPress={() => { hapticImpact(); confirmDelete(item); }}
              onDelete={() => confirmDelete(item)}
              s={s}
              colors={colors}
            />
          </Animated.View>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={s.header}>
        <View style={s.brandRow}>
          <Brand size="md" />
          <Pressable
            style={s.iconButton}
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <AppHeader
          eyebrow={t('home.eyebrow')}
          title={t('recordings.title')}
          subtitle={t('home.subtitle')}
          style={s.pageHeader}
        />

        <View style={s.ctaRow}>
          <View style={s.ctaItem}>
            <Button
              label={t('tabs.summarize')}
              variant="primary"
              leftIcon="sparkles-outline"
              fullWidth
              onPress={() => router.push('/(tabs)/summarize')}
            />
          </View>
          <View style={s.ctaItem}>
            <Button
              label={t('tabs.transcribe')}
              variant="secondary"
              leftIcon="document-text-outline"
              fullWidth
              onPress={() => router.push('/(tabs)/transcribe')}
            />
          </View>
        </View>

        <Input
          leftIcon="search-outline"
          placeholder={t('recordings.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          containerStyle={s.search}
        />
      </Animated.View>

      {renderBody()}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
    brandRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    iconButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    pageHeader: { marginTop: Spacing.lg },
    ctaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    ctaItem: { flex: 1 },
    search: { marginTop: Spacing.sm },

    sectionHeaderRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: Spacing.sm, paddingTop: Spacing.xs,
    },
    sectionCount: { fontFamily: Fonts.mono, fontSize: 12, color: colors.textMuted },

    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: TAB_BAR_OFFSET, paddingTop: Spacing.md },

    cardWrap: { marginBottom: Spacing.sm },
    cardTopRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm,
    },
    cardTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.display, color: colors.text, letterSpacing: -0.3 },
    cardBottomRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: Spacing.sm,
    },
    cardBottomRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardDate: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted },
    cardDuration: { fontSize: 12, fontFamily: Fonts.mono, color: colors.primary },

    skeletonList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    skeletonCard: {
      backgroundColor: colors.bgSurface,
      borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    skeletonTitle: { flex: 1, height: 16, borderRadius: 8, marginRight: 12 },
    skeletonBadge: { width: 72, height: 20, borderRadius: 999 },
    skeletonMeta: { height: 12, width: '45%', borderRadius: 6, marginTop: 14 },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      backgroundColor: colors.error + '12', borderWidth: 1, borderColor: colors.error + '40',
      borderRadius: 16, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
    },
    errorBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: colors.text },
    errorBannerAction: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: colors.primary },
    footer: { alignItems: 'center', paddingVertical: Spacing.md },

    emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingBottom: TAB_BAR_OFFSET },
  });
}
