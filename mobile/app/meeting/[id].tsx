import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Pressable, Share,
} from 'react-native';
import type { AlertButton } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, Transcript, TranscriptSegment, Summary, MeetingStatus, ActionItem } from '@/lib/api';

const PROCESSING = new Set<MeetingStatus>(['queued', 'transcribing', 'summarizing']);

type Tab = 'transcript' | 'summary';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProcessingView({ status, s, t }: { status: MeetingStatus; s: Styles; t: TFunction }) {
  const fakeProgress = useSharedValue(0);

  useEffect(() => {
    // Fake progress: jump to 75% quickly, then crawl toward 90% while the
    // backend does the real work.
    fakeProgress.value = withTiming(0.75, { duration: 2000 });
    const timer = setTimeout(() => {
      fakeProgress.value = withTiming(0.9, { duration: 15000 });
    }, 2000);
    return () => clearTimeout(timer);
  }, [fakeProgress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${fakeProgress.value * 100}%` }));

  return (
    <View style={s.processingView}>
      <View style={s.processingIcon}>
        <Ionicons name="sparkles" size={36} color="#fff" />
      </View>
      <Text style={s.processingTitle}>
        {status === 'queued' ? t('meeting.processingQueued') :
         status === 'transcribing' ? t('meeting.processingTranscribing') :
         t('meeting.processingSummarizing')}
      </Text>
      <Text style={s.processingSubtitle}>{t('meeting.processingSubtitle')}</Text>
      <View style={s.fakeProgressTrack}>
        <Animated.View style={[s.fakeProgressFill, barStyle]} />
      </View>
    </View>
  );
}

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, language } = useTheme();
  const { t } = useTranslation();
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
  const [switcherWidth, setSwitcherWidth] = useState(0);

  const indicator = useSharedValue(0); // 0 = summary, 1 = transcript
  const indicatorStyle = useAnimatedStyle(() => {
    const innerWidth = (switcherWidth - 6) / 2;
    return {
      transform: [{ translateX: 3 + indicator.value * innerWidth }],
      width: innerWidth,
    };
  }, [switcherWidth]);

  function switchTab(next: Tab) {
    setTab(next);
    indicator.value = withSpring(next === 'summary' ? 0 : 1, { damping: 20, stiffness: 250 });
  }

  async function load() {
    setLoadError(null);
    try {
      const m = await api.meetings.get(id);
      setMeeting(m);
      if (m.status === 'done' || m.status === 'transcribed') {
        const [tr, su] = await Promise.allSettled([
          api.meetings.transcript(id),
          api.meetings.summary(id),
        ]);
        if (tr.status === 'fulfilled') setTranscript(tr.value);
        if (su.status === 'fulfilled') setSummary(su.value);
        if (m.status === 'transcribed' && tab === 'summary' && su.status !== 'fulfilled') {
          // Transcript-only meetings land on the transcript view by default.
          switchTab('transcript');
        }
      }
    } catch (e: unknown) {
      setLoadError((e as Error).message ?? t('meeting.loadError'));
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
      Alert.alert(t('common.error'), (e as Error).message);
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
      Alert.alert(t('common.error'), (e as Error).message);
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
      Alert.alert(t('common.error'), (e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      t('meeting.deleteTitle'),
      t('meeting.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.meetings.delete(id);
              router.back();
            } catch (e: unknown) {
              setDeleting(false);
              Alert.alert(t('common.error'), (e as Error).message);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError || !meeting) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{loadError ?? t('meeting.notFound')}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={s.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={s.backLinkText}>← {t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isProcessing = PROCESSING.has(meeting.status);
  const isDone = meeting.status === 'done';

  function openMenu() {
    const buttons: AlertButton[] = [];
    if (isDone) buttons.push({ text: t('meeting.regenerate'), onPress: handleRegenerate });
    buttons.push({ text: t('common.delete'), style: 'destructive', onPress: handleDelete });
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(meeting!.title || t('recordings.untitled'), undefined, buttons);
  }

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={s.topBarRight}>
          <TouchableOpacity onPress={handleShare} disabled={sharing} style={s.iconButton}>
            {sharing
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Ionicons name="share-outline" size={18} color={colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={openMenu} disabled={deleting || regenerating} style={s.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info card */}
      <View style={s.infoCard}>
        <View style={s.aiLabelRow}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={s.aiLabelText}>AI SUMMARY</Text>
        </View>

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
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          >
            <Text style={s.titleText} numberOfLines={2}>
              {meeting.title || t('recordings.untitled')}
            </Text>
          </Pressable>
        )}

        <View style={s.metaRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          {meeting.duration_seconds ? (
            <Text style={s.metaText}>{formatDuration(meeting.duration_seconds)}</Text>
          ) : null}
          <Text style={s.metaText}>{formatDate(meeting.created_at, language)}</Text>
        </View>
      </View>

      {/* Processing state */}
      {isProcessing && <ProcessingView status={meeting.status} s={s} t={t} />}

      {/* Error state */}
      {meeting.status === 'error' && (
        <View style={s.processingWrap}>
          <View style={s.errorCard}>
            <Ionicons name="warning-outline" size={32} color={colors.error} />
            <Text style={s.errorCardTitle}>{t('meeting.errorTitle')}</Text>
            {meeting.error_message ? (
              <Text style={s.errorCardBody}>{meeting.error_message}</Text>
            ) : null}
            <TouchableOpacity style={s.errorRetryBtn} onPress={() => { setLoading(true); load(); }}>
              <Text style={s.errorRetryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      {!isProcessing && meeting.status !== 'error' && (
        <>
          <View
            style={s.switcher}
            onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
          >
            {switcherWidth > 0 && (
              <Animated.View style={[s.switcherIndicator, indicatorStyle]} />
            )}
            <TouchableOpacity style={s.switcherTab} onPress={() => switchTab('summary')}>
              <Text style={[s.switcherText, tab === 'summary' && s.switcherTextActive]}>
                {t('meeting.summary')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.switcherTab} onPress={() => switchTab('transcript')}>
              <Text style={[s.switcherText, tab === 'transcript' && s.switcherTextActive]}>
                {t('meeting.transcript')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            {/* key remounts the view on tab switch so FadeIn replays each time */}
            <Animated.View key={tab} entering={FadeIn.duration(250)}>
              {tab === 'summary' && (
                <SummaryTab
                  summary={summary}
                  status={meeting.status}
                  onGenerate={handleRegenerate}
                  generating={regenerating}
                  colors={colors}
                  s={s}
                  t={t}
                />
              )}
              {tab === 'transcript' && (
                <TranscriptTab transcript={transcript} s={s} t={t} colors={colors} />
              )}
            </Animated.View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

function SummaryTab({
  summary, status, onGenerate, generating, colors, s, t,
}: {
  summary: Summary | null;
  status: MeetingStatus;
  onGenerate: () => void;
  generating: boolean;
  colors: ColorScheme;
  s: Styles;
  t: TFunction;
}) {
  if (!summary && status === 'transcribed') {
    return (
      <View style={s.generateCta}>
        <View style={s.generateIconWrap}>
          <Ionicons name="sparkles" size={28} color={colors.primary} />
        </View>
        <Text style={s.generateTitle}>{t('meeting.generateSummaryTitle')}</Text>
        <Text style={s.generateBody}>{t('meeting.generateSummaryBody')}</Text>
        <TouchableOpacity style={s.generateButton} onPress={onGenerate} disabled={generating}>
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.generateButtonText}>{t('meeting.generateSummary')}</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }
  if (!summary) return <Text style={s.noContent}>{t('meeting.summaryNotAvailable')}</Text>;

  return (
    <View style={{ gap: 24 }}>
      <Section title={t('meeting.overview')} s={s}>
        <Text style={s.bodyText}>{summary.overview}</Text>
      </Section>
      {summary.decisions.length > 0 && (
        <Section title={t('meeting.decisions')} s={s}>
          {summary.decisions.map((d, i) => <BulletItem key={i} text={d} colors={colors} s={s} />)}
        </Section>
      )}
      {summary.action_items.length > 0 && (
        <Section title={t('meeting.actionItems')} s={s}>
          {summary.action_items.map((a, i) => (
            <ActionBullet key={i} item={a} colors={colors} s={s} t={t} />
          ))}
        </Section>
      )}
      {summary.topics.length > 0 && (
        <Section title={t('meeting.topics')} s={s}>
          <View style={s.topicsRow}>
            {summary.topics.map((topic, i) => (
              <View key={i} style={s.topicChip}>
                <Text style={s.topicChipText}>{topic}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}
      {summary.sentiment ? (
        <Section title={t('meeting.sentiment')} s={s}>
          <Text style={s.bodyText}>{summary.sentiment}</Text>
        </Section>
      ) : null}
      {summary.key_quotes.length > 0 && (
        <Section title={t('meeting.keyQuotes')} s={s}>
          {summary.key_quotes.map((q, i) => (
            <Text key={i} style={s.quote}>"{q}"</Text>
          ))}
        </Section>
      )}
    </View>
  );
}

function TranscriptTab({ transcript, s, t, colors }: {
  transcript: Transcript | null; s: Styles; t: TFunction; colors: ColorScheme;
}) {
  if (!transcript) return <Text style={s.noContent}>{t('meeting.transcriptNotAvailable')}</Text>;

  // Prefer segments (speaker + timestamp format) when they exist
  if (transcript.segments && transcript.segments.length > 0) {
    return (
      <View>
        <Text style={s.sectionTitle}>{t('meeting.fullTranscript')}</Text>
        <View style={{ marginTop: 16, gap: 16 }}>
          {transcript.segments.map((seg, i) => (
            <TranscriptRow key={i} segment={seg} colors={colors} s={s} />
          ))}
        </View>
      </View>
    );
  }

  // Fallback: plain text
  return (
    <View>
      <Text style={s.sectionTitle}>{t('meeting.fullTranscript')}</Text>
      <Text style={[s.transcriptText, { marginTop: 12 }]}>{transcript.full_text}</Text>
    </View>
  );
}

function TranscriptRow({ segment, colors, s }: {
  segment: TranscriptSegment; colors: ColorScheme; s: Styles;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Text style={{
        fontSize: 12, fontFamily: Fonts.body,
        color: colors.textMuted, width: 40,
        paddingTop: 2, fontVariant: ['tabular-nums'],
      }}>
        {formatTimestamp(segment.start)}
      </Text>
      <View style={{ flex: 1 }}>
        {segment.speaker && (
          <Text style={{
            fontSize: 13, fontFamily: Fonts.displaySemiBold,
            color: colors.primary, marginBottom: 3,
          }}>
            {segment.speaker}
          </Text>
        )}
        <Text style={{ fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 }}>
          {segment.text}
        </Text>
      </View>
    </View>
  );
}

function Section({ title, children, s }: {
  title: string; children: React.ReactNode; s: Styles;
}) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
      {children}
    </View>
  );
}

function BulletItem({ text, colors, s }: { text: string; colors: ColorScheme; s: Styles }) {
  return (
    <View style={s.bulletRow}>
      <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 8, marginTop: 4 }} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function ActionBullet({ item, colors, s, t }: {
  item: ActionItem; colors: ColorScheme; s: Styles; t: TFunction;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ fontSize: 13, fontFamily: Fonts.displaySemiBold, color: '#fff' }}>
          {item.assignee?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: Fonts.displaySemiBold, color: colors.primary }}>
          {item.assignee ?? t('meeting.unassigned')}
        </Text>
        <Text style={s.bulletText}>{item.task}</Text>
        {item.deadline ? <Text style={s.actionMeta}>{item.deadline}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
    errorText: { color: colors.error, fontSize: 15, fontFamily: Fonts.body, textAlign: 'center', marginBottom: 16 },
    retryBtn: {
      backgroundColor: colors.bgSurface, borderRadius: 12, paddingVertical: 10,
      paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border,
    },
    retryText: { color: colors.text, fontSize: 14, fontFamily: Fonts.bodyMedium },
    backLinkText: { color: colors.primary, fontSize: 14, fontFamily: Fonts.bodyMedium },

    topBar: {
      paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.bg,
    },
    topBarRight: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },

    infoCard: {
      marginHorizontal: 16, marginBottom: 16,
      backgroundColor: colors.primary + '12',
      borderRadius: 20,
      borderWidth: 1, borderColor: colors.primary + '25',
      padding: 16,
    },
    aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    aiLabelText: {
      fontSize: 11, fontFamily: Fonts.displaySemiBold,
      color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8,
    },
    titleText: { fontSize: 20, fontFamily: Fonts.display, color: colors.text, marginTop: 8 },
    titleInput: {
      fontSize: 20, fontFamily: Fonts.display, color: colors.text, marginTop: 8,
      borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4,
    },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
    metaText: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted },

    processingView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    processingIcon: {
      width: 88, height: 88, borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    processingTitle: {
      fontSize: 24, fontFamily: Fonts.display, color: colors.text,
      marginTop: 24, textAlign: 'center',
    },
    processingSubtitle: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      marginTop: 8, textAlign: 'center', maxWidth: 280,
    },
    fakeProgressTrack: {
      marginTop: 32, width: '80%',
      height: 6, borderRadius: 3, backgroundColor: colors.border,
      overflow: 'hidden',
    },
    fakeProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

    processingWrap: { flex: 1, justifyContent: 'center', padding: 24 },
    errorCard: {
      alignItems: 'center',
      backgroundColor: colors.error + '10',
      borderRadius: 20, borderWidth: 1, borderColor: colors.error + '33',
      padding: 28,
    },
    errorCardTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.error, marginTop: 12, textAlign: 'center' },
    errorCardBody: {
      fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted,
      marginTop: 8, textAlign: 'center', lineHeight: 20,
    },
    errorRetryBtn: {
      marginTop: 20, borderWidth: 1, borderColor: colors.error,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11,
    },
    errorRetryText: { color: colors.error, fontSize: 14, fontFamily: Fonts.bodyMedium },

    switcher: {
      flexDirection: 'row',
      marginHorizontal: 20, marginTop: 16, marginBottom: 4,
      backgroundColor: colors.bgSurface,
      borderRadius: 12, padding: 3,
      borderWidth: 1, borderColor: colors.border,
    },
    switcherIndicator: {
      position: 'absolute', top: 3, bottom: 3,
      backgroundColor: colors.primary,
      borderRadius: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12, shadowRadius: 3,
      elevation: 2,
    },
    switcherTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
    switcherText: { fontSize: 14, fontFamily: Fonts.displaySemiBold, color: colors.textMuted },
    switcherTextActive: { color: '#fff' },

    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    noContent: { color: colors.textMuted, fontSize: 14, fontFamily: Fonts.body, textAlign: 'center', marginTop: 40 },

    generateCta: {
      alignItems: 'center', padding: 24,
      backgroundColor: colors.bgSurface,
      borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary,
      marginTop: 16,
    },
    generateIconWrap: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primary + '12',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    generateTitle: {
      fontSize: 18, fontFamily: Fonts.display, color: colors.text,
      textAlign: 'center', marginBottom: 8,
    },
    generateBody: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', lineHeight: 22, marginBottom: 20,
    },
    generateButton: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 15, alignSelf: 'stretch', alignItems: 'center',
    },
    generateButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },

    sectionTitle: {
      fontSize: 12, fontFamily: Fonts.displaySemiBold, color: colors.primary,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    sectionRule: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    bodyText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 24 },
    bulletRow: { flexDirection: 'row', marginBottom: 6 },
    bulletText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 },
    actionMeta: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 2 },
    topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    topicChip: {
      backgroundColor: colors.primary + '12',
      borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
    },
    topicChipText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.primary },
    quote: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, fontStyle: 'italic',
      borderLeftWidth: 3, borderLeftColor: colors.primary,
      paddingLeft: 12, marginBottom: 8, lineHeight: 22,
    },
    transcriptText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 24 },
  });
}

type Styles = ReturnType<typeof createStyles>;
