import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
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

const STATUS_COLOR: Record<MeetingStatus, string> = {
  queued: Colors.dark.textMuted,
  transcribing: Colors.dark.accent,
  transcribed: Colors.dark.primary,
  summarizing: Colors.dark.accent,
  done: Colors.dark.success,
  error: Colors.dark.error,
};

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
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

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
        <ActivityIndicator color={Colors.dark.primary} />
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
          placeholderTextColor={Colors.dark.textMuted}
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
            tintColor={Colors.dark.primary}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.dark.bgSurface,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    borderWidth: 1, borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    color: Colors.dark.text, fontSize: 14,
  },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.dark.bgSurface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  emptyIconText: { fontSize: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark.text, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textMuted, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.border,
    gap: 12,
  },
  cardLeft: {},
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.dark.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.dark.text, marginBottom: 3 },
  cardMeta: { fontSize: 12, color: Colors.dark.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabIcon: { fontSize: 26, color: '#fff', fontWeight: '300' },
});
