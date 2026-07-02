import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Pressable, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, Transcript, Summary, MeetingStatus, ActionItem } from '@/lib/api';

const PROCESSING = new Set<MeetingStatus>(['queued', 'transcribing', 'summarizing']);

type Tab = 'summary' | 'transcript';

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
    errorText: { color: colors.error, fontSize: 15, textAlign: 'center', marginBottom: 16 },
    retryBtn: {
      backgroundColor: colors.bgSurface, borderRadius: 8, paddingVertical: 10,
      paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border,
    },
    retryText: { color: colors.text, fontSize: 14 },
    backLinkText: { color: colors.primary, fontSize: 14 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: 52, paddingBottom: 8, paddingHorizontal: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    backText: { color: colors.primary, fontSize: 17 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shareBtn: { padding: 4 },
    shareText: { color: colors.primary, fontSize: 14 },
    regenerateBtn: { padding: 4 },
    regenerateText: { color: colors.textMuted, fontSize: 13 },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error + '44',
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    },
    deleteText: { color: colors.error, fontSize: 13, fontWeight: '600' },
    titleRow: { padding: 20, paddingBottom: 12 },
    titleText: { fontSize: 20, fontWeight: '700', color: colors.text },
    titleHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
    titleInput: {
      fontSize: 20, fontWeight: '700', color: colors.text,
      borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4,
    },
    processingBanner: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 20, marginBottom: 8,
      backgroundColor: colors.accent + '22',
      borderRadius: 8, padding: 12,
    },
    processingText: { color: colors.accent, fontSize: 14 },
    tabs: {
      flexDirection: 'row', marginHorizontal: 20,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
    tabTextActive: { color: colors.primary },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    noContent: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 40 },
    generateCta: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    generateTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 10 },
    generateBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
    generateButton: {
      backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 14, paddingHorizontal: 32,
    },
    generateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
    },
    bodyText: { fontSize: 15, color: colors.text, lineHeight: 22 },
    bulletRow: { flexDirection: 'row', marginBottom: 6 },
    bullet: { color: colors.primary, marginRight: 8, fontSize: 15 },
    bulletText: { fontSize: 15, color: colors.text, lineHeight: 22 },
    actionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    quote: {
      fontSize: 14, color: colors.textMuted, fontStyle: 'italic',
      borderLeftWidth: 3, borderLeftColor: colors.primary,
      paddingLeft: 12, marginBottom: 8,
    },
    transcriptText: { fontSize: 15, color: colors.text, lineHeight: 24 },
  });
}

type Styles = ReturnType<typeof createStyles>;

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const m = await api.meetings.get(id);
      setMeeting(m);
      if (m.status === 'done' || m.status === 'transcribed') {
        const [t, s] = await Promise.allSettled([
          api.meetings.transcript(id),
          api.meetings.summary(id),
        ]);
        if (t.status === 'fulfilled') setTranscript(t.value);
        if (s.status === 'fulfilled') setSummary(s.value);
      }
    } catch (e: unknown) {
      setLoadError((e as Error).message ?? 'Failed to load recording.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!meeting || !PROCESSING.has(meeting.status)) return;
    const timer = setInterval(async () => {
      try {
        const { status } = await api.meetings.status(id);
        setMeeting((prev) => prev ? { ...prev, status } : prev);
        if (!PROCESSING.has(status)) {
          clearInterval(timer);
          load();
        }
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, [meeting?.status]);

  async function saveTitle() {
    if (!meeting || titleDraft.trim() === meeting.title) { setEditingTitle(false); return; }
    try {
      const updated = await api.meetings.update(id, { title: titleDraft.trim() });
      setMeeting(updated);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    }
    setEditingTitle(false);
  }

  async function handleShare() {
    setSharing(true);
    try {
      const { token } = await api.meetings.share.create(id);
      const url = `https://summarex.app/shared/${token}`;
      await Share.share({ message: url, url });
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSharing(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await api.meetings.regenerateSummary(id);
      setSummary(null);
      setMeeting((prev) => prev ? { ...prev, status: 'summarizing' } : prev);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete recording',
      'This will permanently delete the recording, transcript, and summary. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.meetings.delete(id);
              router.back();
            } catch (e: unknown) {
              setDeleting(false);
              Alert.alert('Error', (e as Error).message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (loadError || !meeting) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{loadError ?? 'Recording not found.'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={s.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isProcessing = PROCESSING.has(meeting.status);
  const isDone = meeting.status === 'done';
  const isTranscribed = meeting.status === 'transcribed';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.headerRight}>
          {sharing ? (
            <ActivityIndicator size="small" color={colors.textMuted} style={{ marginRight: 8 }} />
          ) : (
            <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
              <Text style={s.shareText}>Share</Text>
            </TouchableOpacity>
          )}
          {isDone && (
            <TouchableOpacity
              onPress={handleRegenerate}
              disabled={regenerating}
              style={s.regenerateBtn}
            >
              {regenerating
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Text style={s.regenerateText}>Regenerate</Text>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} disabled={deleting} style={s.deleteBtn}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Ionicons name="trash-outline" size={18} color={colors.error} />
            }
            <Text style={s.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <View style={s.titleRow}>
        {editingTitle ? (
          <TextInput
            style={s.titleInput}
            value={titleDraft}
            onChangeText={setTitleDraft}
            onBlur={saveTitle}
            onSubmitEditing={saveTitle}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <Pressable
            onPress={() => { setTitleDraft(meeting.title); setEditingTitle(true); }}
            style={{ flex: 1 }}
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          >
            <Text style={s.titleText} numberOfLines={2}>{meeting.title || 'Untitled recording'}</Text>
            <Text style={s.titleHint}>Tap to edit</Text>
          </Pressable>
        )}
      </View>

      {/* Processing banner */}
      {isProcessing && (
        <View style={s.processingBanner}>
          <ActivityIndicator color={colors.accent} size="small" style={{ marginRight: 10 }} />
          <Text style={s.processingText}>
            {meeting.status === 'queued' ? 'Queued for processing…' :
             meeting.status === 'transcribing' ? 'Transcribing audio…' : 'Generating summary…'}
          </Text>
        </View>
      )}

      {/* Error banner */}
      {meeting.status === 'error' && (
        <View style={[s.processingBanner, { backgroundColor: colors.error + '22' }]}>
          <Text style={[s.processingText, { color: colors.error }]}>
            {meeting.error_message ?? 'Processing failed.'}
          </Text>
        </View>
      )}

      {/* Tabs — show when not actively processing */}
      {!isProcessing && meeting.status !== 'error' && (
        <>
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, tab === 'summary' && s.tabActive]}
              onPress={() => setTab('summary')}
            >
              <Text style={[s.tabText, tab === 'summary' && s.tabTextActive]}>Summary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, tab === 'transcript' && s.tabActive]}
              onPress={() => setTab('transcript')}
            >
              <Text style={[s.tabText, tab === 'transcript' && s.tabTextActive]}>Transcript</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {tab === 'summary' && (
              <SummaryTab
                summary={summary}
                status={meeting.status}
                onGenerate={handleRegenerate}
                generating={regenerating}
                s={s}
              />
            )}
            {tab === 'transcript' && <TranscriptTab transcript={transcript} s={s} />}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function SummaryTab({
  summary,
  status,
  onGenerate,
  generating,
  s,
}: {
  summary: Summary | null;
  status: MeetingStatus;
  onGenerate: () => void;
  generating: boolean;
  s: Styles;
}) {
  if (!summary && status === 'transcribed') {
    return (
      <View style={s.generateCta}>
        <Text style={s.generateTitle}>Ready for a summary?</Text>
        <Text style={s.generateBody}>
          Turn this transcript into decisions, action items, and key quotes.
        </Text>
        <TouchableOpacity style={s.generateButton} onPress={onGenerate} disabled={generating}>
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.generateButtonText}>Generate Summary</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }
  if (!summary) return <Text style={s.noContent}>Summary not available yet.</Text>;

  return (
    <View style={{ gap: 20 }}>
      <Section title="Overview" s={s}>
        <Text style={s.bodyText}>{summary.overview}</Text>
      </Section>
      {summary.decisions.length > 0 && (
        <Section title="Decisions" s={s}>
          {summary.decisions.map((d, i) => <BulletItem key={i} text={d} s={s} />)}
        </Section>
      )}
      {summary.action_items.length > 0 && (
        <Section title="Action Items" s={s}>
          {summary.action_items.map((a, i) => (
            <ActionBullet key={i} item={a} s={s} />
          ))}
        </Section>
      )}
      {summary.topics.length > 0 && (
        <Section title="Topics" s={s}>
          <Text style={s.bodyText}>{summary.topics.join(', ')}</Text>
        </Section>
      )}
      {summary.key_quotes.length > 0 && (
        <Section title="Key Quotes" s={s}>
          {summary.key_quotes.map((q, i) => (
            <Text key={i} style={s.quote}>"{q}"</Text>
          ))}
        </Section>
      )}
    </View>
  );
}

function TranscriptTab({ transcript, s }: { transcript: Transcript | null; s: Styles }) {
  if (!transcript) return <Text style={s.noContent}>Transcript not available yet.</Text>;
  return <Text style={s.transcriptText}>{transcript.full_text}</Text>;
}

function Section({ title, children, s }: { title: string; children: React.ReactNode; s: Styles }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletItem({ text, s }: { text: string; s: Styles }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function ActionBullet({ item, s }: { item: ActionItem; s: Styles }) {
  const meta = [item.assignee, item.deadline].filter(Boolean).join(' · ');
  return (
    <View style={s.bulletRow}>
      <Text style={s.bullet}>•</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.bulletText}>{item.task}</Text>
        {meta ? <Text style={s.actionMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}
