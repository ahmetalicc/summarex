import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

export default function MeetingsScreen() {
  const router = useRouter();
  const { colors, language } = useTheme();
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const STATUS_COLOR = useMemo(() => statusColors(colors), [colors]);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 8,
      color: colors.text, fontSize: 14, fontFamily: Fonts.body,
    },
    list: { padding: 16, gap: 10 },
    emptyContainer: { flex: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 32 },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 20,
      backgroundColor: colors.bgSurface,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    emptyTitle: {
      fontSize: 17, fontFamily: Fonts.display, color: colors.text,
      marginBottom: 8, textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', lineHeight: 20,
    },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: colors.border,
      borderLeftWidth: 3,
      gap: 12,
    },
    cardIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: colors.primary + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: Fonts.displaySemiBold, color: colors.text, marginBottom: 3 },
    cardMeta: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    cardStatus: {
      fontSize: 11, fontFamily: Fonts.bodyMedium, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4,
    },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      elevation: 6,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    },
  }), [colors]);

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

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Brand size="sm" />
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

      <FlatList
        data={meetings}
        keyExtractor={(m) => m.id}
        contentContainerStyle={meetings.length === 0 ? s.emptyContainer : s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="mic-outline" size={32} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>{t('recordings.emptyTitle')}</Text>
            <Text style={s.emptySubtitle}>{t('recordings.emptySubtitle')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]}
            onPress={() => router.push(`/meeting/${item.id}` as never)}
            activeOpacity={0.75}
          >
            <View style={s.cardIconWrap}>
              <Ionicons name="musical-notes" size={20} color={colors.primary} />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.title || t('recordings.untitled')}
              </Text>
              <Text style={s.cardMeta}>
                {formatDate(item.created_at, language)}
                {item.duration_seconds ? `  ·  ${formatDuration(item.duration_seconds)}` : ''}
              </Text>
              <Text style={[s.cardStatus, { color: STATUS_COLOR[item.status] }]}>
                {t(STATUS_KEY[item.status])}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/upload')}
        activeOpacity={0.85}
        accessibilityLabel={t('newRecording.title')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
