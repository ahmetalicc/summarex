import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import { Colors } from '@/constants/colors';
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

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.meetings.list({ limit: 50 });
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
        <Text style={s.headerTitle}>Recordings</Text>
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
            <Text style={s.emptyIcon}>🎙</Text>
            <Text style={s.emptyTitle}>No recordings yet</Text>
            <Text style={s.emptySubtitle}>Upload an audio file to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/meeting/${item.id}` as never)}>
            <View style={s.cardTop}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
            <Text style={s.cardMeta}>
              {formatDate(item.created_at)}{item.duration_seconds ? `  ·  ${formatDuration(item.duration_seconds)}` : ''}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => router.push('/upload')}>
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.bg },
  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.dark.bgSurface,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.dark.text },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.dark.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.dark.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: Colors.dark.bgSurface,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.dark.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 12, color: Colors.dark.textMuted },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32 },
});
