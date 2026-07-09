import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, Alert, Pressable } from 'react-native';
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
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, TAB_BAR_OFFSET } from '@/constants/tokens';
import { Brand } from '@/components/Brand';
import { AppHeader } from '@/components/AppHeader';
import { Button, Card, Input, Badge, EmptyState, Eyebrow } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, MeetingStatus } from '@/lib/api';

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
  meeting, statusLabel, statusVariant, meta, onPress, onLongPress, s, colors,
}: {
  meeting: Meeting;
  statusLabel: string;
  statusVariant: BadgeVariant;
  meta: string;
  onPress: () => void;
  onLongPress: () => void;
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
            {meeting.title || t('recordings.untitled')}
          </Text>
          <Badge label={statusLabel} variant={statusVariant} />
        </View>
        <View style={s.cardBottomRow}>
          <Text style={s.cardDate}>{meta}</Text>
          {duration !== '' && <Text style={s.cardDuration}>{duration}</Text>}
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
  const [search, setSearch] = useState('');
  const hasAnimated = useRef(false);

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

  function confirmDelete(meeting: Meeting) {
    Alert.alert(t('meeting.deleteTitle'), t('meeting.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.meetings.delete(meeting.id);
            setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={s.sectionHeaderRow}>
            <Eyebrow>{t('recordings.recentTitle')}</Eyebrow>
            <Text style={s.sectionCount}>{meetings.length}</Text>
          </View>
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

    emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingBottom: TAB_BAR_OFFSET },
  });
}
