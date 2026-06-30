import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/constants/colors';
import { Brand } from '@/components/Brand';
import type { Meeting, MeetingStatus } from '@/lib/api';

const STATUS_LABEL: Record<MeetingStatus, string> = {
  queued: 'Queued',
  transcribing: 'Transcribing…',
  transcribed: 'Transcribed',
  summarizing: 'Summarizing…',
  done: 'Done',
  error: 'Error',
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MeetingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      color: colors.text, fontSize: 14,
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
    emptyIconText: { fontSize: 32 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: colors.border,
      gap: 12,
    },
    cardLeft: {},
    cardIconWrap: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: colors.primary + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    cardIcon: { fontSize: 18 },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 3 },
    cardMeta: { fontSize: 12, color: colors.textMuted },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      elevation: 6,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    },
    fabIcon: { fontSize: 26, color: '#fff', fontWeight: '300' },
  }), [colors]);

  async function load(isRefresh = false, q = search) {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.meetings.list({ limit: 50, search: q || undefined });
      setMeetings(data);
    } catch (e: unknown) {
      if (!isRefresh) Alert.alert('Error', (e as Error).message);
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
    const t = setTimeout(() => load(false, search), 300);
    return () => clearTimeout(t);
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
          placeholder="Search recordings…"
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
              <Text style={s.emptyIconText}>🎙</Text>
            </View>
            <Text style={s.emptyTitle}>No recordings yet</Text>
            <Text style={s.emptySubtitle}>
              Tap the + button to upload your first audio file.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/meeting/${item.id}` as never)}
            activeOpacity={0.75}
          >
            <View style={s.cardLeft}>
              <View style={s.cardIconWrap}>
                <Text style={s.cardIcon}>🎵</Text>
              </View>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title || 'Untitled recording'}</Text>
              <Text style={s.cardMeta}>
                {formatDate(item.created_at)}
                {item.duration_seconds ? `  ·  ${formatDuration(item.duration_seconds)}` : ''}
              </Text>
            </View>
            <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] + '18' }]}>
              <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => router.push('/upload')} activeOpacity={0.85}>
        <Text style={s.fabIcon}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}
