import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Pressable, Share,
} from 'react-native';
import type { AlertButton } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeIn,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@/lib/haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing } from '@/constants/tokens';
import { Card, Badge, Eyebrow, Button } from '@/components/ui';
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

function ProcessingView({ status, s, colors, t }: { status: MeetingStatus; s: Styles; colors: ColorScheme; t: TFunction }) {
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
        <Ionicons name="sparkles" size={40} color={colors.bg} />
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
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  function switchTab(next: Tab) {
    if (next === tab) return;
    hapticImpact();
    setTab(next);
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
        if (m.status === 'transcribed' && su.status !== 'fulfilled') {
          // Transcript-only meetings land on the transcript view by default.
          setTab('transcript');
        }
      }
    } catch (e: unknown) {
      setLoadError((e as Error).message ?? t('meeting.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    api.entitlement.me().then((e) => setIsPro(e.tier === 'pro')).catch(() => setIsPro(false));
  }, [id]);

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

  async function handleCopy() {
    if (!meeting) return;
    hapticImpact();
    const title = meeting.title || t('recordings.untitled');
    const date = formatDate(meeting.created_at, language);
    let text = '';

    if (tab === 'summary' && summary) {
      text = buildSummaryCopyText(summary, title, date, t);
      if (isPro !== true) text += `\n\n—\n${t('meeting.copyWatermarkSummary')}`;
    } else if (tab === 'transcript' && transcript) {
      text = buildTranscriptCopyText(transcript, title, date, t);
      if (isPro !== true) text += `\n\n—\n${t('meeting.copyWatermarkTranscript')}`;
    } else {
      return;
    }

    try {
      // expo-clipboard works in dev/production builds but not in Expo Go.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      hapticNotification(NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for Expo Go: open share sheet so user can copy from there.
      await Share.share({ message: text });
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
    Alert.alert(t('meeting.deleteTitle'), t('meeting.deleteBody'), [
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
    ]);
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
      <SafeAreaView style={s.center} edges={['top', 'bottom']}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={s.errorText}>{loadError ?? t('meeting.notFound')}</Text>
        <Button label={t('common.retry')} variant="secondary" onPress={() => { setLoading(true); load(); }} />
        <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={s.backLinkText}>← {t('common.back')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isProcessing = PROCESSING.has(meeting.status);

  function openMenu() {
    const buttons: AlertButton[] = [];
    if (meeting!.status === 'done') buttons.push({ text: t('meeting.regenerate'), onPress: handleRegenerate });
    buttons.push({ text: t('common.delete'), style: 'destructive', onPress: handleDelete });
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(meeting!.title || t('recordings.untitled'), undefined, buttons);
  }

  const showContent = !isProcessing && meeting.status !== 'error';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={s.ghostButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={s.topBarRight}>
          <Pressable
            onPress={handleCopy}
            disabled={!showContent || copied}
            style={s.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? colors.primary : colors.text}
            />
          </Pressable>
          <Pressable onPress={handleShare} disabled={sharing} style={s.iconButton}>
            {sharing
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Ionicons name="share-outline" size={18} color={colors.text} />}
          </Pressable>
          <Pressable onPress={openMenu} disabled={deleting || regenerating} style={s.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Title + meta */}
      <View style={s.titleBlock}>
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
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={s.title} numberOfLines={2}>
              {meeting.title || t('recordings.untitled')}
            </Text>
          </Pressable>
        )}
        <View style={s.metaRow}>
          <Text style={s.metaText}>{formatDate(meeting.created_at, language)}</Text>
          {meeting.duration_seconds ? (
            <>
              <View style={s.metaDot} />
              <Text style={s.metaText}>{formatDuration(meeting.duration_seconds)}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Sticky segmented control */}
      {showContent && (
        <View style={s.switcher}>
          <Pressable style={[s.switcherTab, tab === 'summary' && s.switcherTabActive]} onPress={() => switchTab('summary')}>
            <Text style={[s.switcherText, tab === 'summary' && s.switcherTextActive]}>{t('meeting.summary')}</Text>
          </Pressable>
          <Pressable style={[s.switcherTab, tab === 'transcript' && s.switcherTabActive]} onPress={() => switchTab('transcript')}>
            <Text style={[s.switcherText, tab === 'transcript' && s.switcherTextActive]}>{t('meeting.transcript')}</Text>
          </Pressable>
        </View>
      )}

      {isProcessing && <ProcessingView status={meeting.status} s={s} colors={colors} t={t} />}

      {meeting.status === 'error' && (
        <View style={s.errorWrap}>
          <View style={s.errorCard}>
            <Ionicons name="warning-outline" size={32} color={colors.error} />
            <Text style={s.errorCardTitle}>{t('meeting.errorTitle')}</Text>
            {meeting.error_message ? <Text style={s.errorCardBody}>{meeting.error_message}</Text> : null}
            <View style={{ marginTop: Spacing.md }}>
              <Button label={t('common.retry')} variant="danger" onPress={() => { setLoading(true); load(); }} />
            </View>
          </View>
        </View>
      )}

      {showContent && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <Animated.View key={tab} entering={FadeIn.duration(250)}>
            {tab === 'summary' ? (
              <SummaryTab
                summary={summary}
                status={meeting.status}
                onGenerate={handleRegenerate}
                generating={regenerating}
                colors={colors}
                s={s}
                t={t}
              />
            ) : (
              <TranscriptTab transcript={transcript} s={s} t={t} colors={colors} />
            )}
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SectionCard({ eyebrow, children, s }: { eyebrow: string; children: React.ReactNode; s: Styles }) {
  return (
    <Card>
      <Eyebrow>{eyebrow}</Eyebrow>
      <View style={{ marginTop: Spacing.sm }}>{children}</View>
    </Card>
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
      <Card gradient>
        <View style={s.generateCta}>
          <View style={s.generateIconWrap}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={s.generateTitle}>{t('meeting.generateSummaryTitle')}</Text>
          <Text style={s.generateBody}>{t('meeting.generateSummaryBody')}</Text>
          <Button label={t('meeting.generateSummary')} variant="primary" onPress={onGenerate} isLoading={generating} />
        </View>
      </Card>
    );
  }
  if (!summary) return <Text style={s.noContent}>{t('meeting.summaryNotAvailable')}</Text>;

  return (
    <View style={{ gap: Spacing.md }}>
      <SectionCard eyebrow={t('meeting.overview')} s={s}>
        <Text style={s.bodyText}>{summary.overview}</Text>
      </SectionCard>

      {summary.decisions.length > 0 && (
        <SectionCard eyebrow={t('meeting.decisions')} s={s}>
          {summary.decisions.map((d, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bulletDot} />
              <Text style={s.bulletText}>{d}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {summary.action_items.length > 0 && (
        <SectionCard eyebrow={t('meeting.actionItems')} s={s}>
          <View style={{ gap: Spacing.sm }}>
            {summary.action_items.map((a, i) => (
              <ActionItemCard key={i} item={a} colors={colors} s={s} t={t} />
            ))}
          </View>
        </SectionCard>
      )}

      {summary.topics.length > 0 && (
        <SectionCard eyebrow={t('meeting.topics')} s={s}>
          <View style={s.topicsRow}>
            {summary.topics.map((topic, i) => (
              <Badge key={i} label={topic} variant="accent" />
            ))}
          </View>
        </SectionCard>
      )}

      {summary.sentiment ? (
        <SectionCard eyebrow={t('meeting.sentiment')} s={s}>
          <Text style={s.bodyText}>{summary.sentiment}</Text>
        </SectionCard>
      ) : null}

      {summary.key_quotes.length > 0 && (
        <SectionCard eyebrow={t('meeting.keyQuotes')} s={s}>
          {summary.key_quotes.map((q, i) => (
            <Text key={i} style={s.quote}>&ldquo;{q}&rdquo;</Text>
          ))}
        </SectionCard>
      )}
    </View>
  );
}

function ActionItemCard({ item, colors, s, t }: { item: ActionItem; colors: ColorScheme; s: Styles; t: TFunction }) {
  return (
    <View style={s.actionCard}>
      <View style={s.actionTopRow}>
        <Badge label={item.assignee ?? t('meeting.unassigned')} variant="accent" />
        {item.deadline ? <Text style={s.actionDeadline}>{item.deadline}</Text> : null}
      </View>
      <Text style={s.actionTask}>{item.task}</Text>
    </View>
  );
}

function TranscriptTab({ transcript, s, t, colors }: {
  transcript: Transcript | null; s: Styles; t: TFunction; colors: ColorScheme;
}) {
  if (!transcript) return <Text style={s.noContent}>{t('meeting.transcriptNotAvailable')}</Text>;

  if (transcript.segments && transcript.segments.length > 0) {
    return (
      <View style={{ gap: Spacing.md }}>
        {transcript.segments.map((seg, i) => (
          <TranscriptRow key={i} segment={seg} colors={colors} s={s} />
        ))}
      </View>
    );
  }

  return (
    <Card>
      <Eyebrow>{t('meeting.fullTranscript')}</Eyebrow>
      <Text style={[s.bodyText, { marginTop: Spacing.sm }]}>{transcript.full_text}</Text>
    </Card>
  );
}

function TranscriptRow({ segment, colors, s }: { segment: TranscriptSegment; colors: ColorScheme; s: Styles }) {
  return (
    <View style={s.transcriptRow}>
      <Badge label={formatTimestamp(segment.start)} variant="info" style={s.transcriptTs} />
      <View style={{ flex: 1 }}>
        {segment.speaker && <Text style={s.speaker}>{segment.speaker}</Text>}
        <Text style={s.transcriptText}>{segment.text}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: Spacing.lg, gap: Spacing.md },
    errorText: { color: colors.text, fontSize: 15, fontFamily: Fonts.body, textAlign: 'center' },
    backLinkText: { color: colors.primary, fontSize: 14, fontFamily: Fonts.bodyMedium },

    topBar: {
      paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.xs,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    topBarRight: { flexDirection: 'row', gap: Spacing.xs },
    ghostButton: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    iconButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },

    titleBlock: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.md },
    title: { fontSize: 28, fontFamily: Fonts.display, color: colors.text, letterSpacing: -0.5, lineHeight: 32 },
    titleInput: {
      fontSize: 28, fontFamily: Fonts.display, color: colors.text, letterSpacing: -0.5,
      borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4,
    },
    metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
    metaText: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted },

    switcher: {
      flexDirection: 'row', gap: Spacing.xs,
      marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
      backgroundColor: colors.bgSurface,
      borderRadius: 999, padding: 4,
      borderWidth: 1, borderColor: colors.border,
    },
    switcherTab: {
      flex: 1, paddingVertical: 10, borderRadius: 999,
      alignItems: 'center', borderWidth: 1, borderColor: 'transparent',
    },
    switcherTabActive: {
      backgroundColor: colors.bgElevated,
      borderColor: colors.primary,
    },
    switcherText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: colors.textMuted },
    switcherTextActive: { color: colors.primary },

    processingView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
    processingIcon: {
      width: 88, height: 88, borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    processingTitle: { fontSize: 28, fontFamily: Fonts.display, color: colors.text, marginTop: Spacing.lg, textAlign: 'center', letterSpacing: -0.5 },
    processingSubtitle: { fontSize: 15, fontFamily: Fonts.body, color: colors.textMuted, marginTop: Spacing.xs, textAlign: 'center', maxWidth: 280 },
    fakeProgressTrack: {
      marginTop: Spacing.xl, width: '80%', height: 6, borderRadius: 3,
      backgroundColor: colors.bgElevated, overflow: 'hidden',
    },
    fakeProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },

    errorWrap: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
    errorCard: {
      alignItems: 'center',
      backgroundColor: colors.error + '12',
      borderRadius: 24, borderWidth: 1, borderColor: colors.error + '40',
      padding: Spacing.xl,
    },
    errorCardTitle: { fontSize: 18, fontFamily: Fonts.displaySemiBold, color: colors.error, marginTop: Spacing.sm, textAlign: 'center' },
    errorCardBody: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, marginTop: Spacing.xs, textAlign: 'center', lineHeight: 20 },

    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 40 },
    noContent: { color: colors.textMuted, fontSize: 15, fontFamily: Fonts.body, textAlign: 'center', marginTop: 40 },

    generateCta: { alignItems: 'center', paddingVertical: Spacing.sm },
    generateIconWrap: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: `rgba(${colors.primaryRgb}, 0.14)`,
      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    },
    generateTitle: { fontSize: 22, fontFamily: Fonts.display, color: colors.text, textAlign: 'center', marginBottom: Spacing.xs },
    generateBody: { fontSize: 15, fontFamily: Fonts.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },

    bodyText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 24 },

    bulletRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs, alignItems: 'flex-start' },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
    bulletText: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 },

    actionCard: {
      backgroundColor: `rgba(${colors.accentRgb}, 0.1)`,
      borderWidth: 1, borderColor: `rgba(${colors.accentRgb}, 0.25)`,
      borderRadius: 16, padding: Spacing.md,
    },
    actionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    actionDeadline: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted },
    actionTask: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 },

    topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },

    quote: {
      fontSize: 15, fontFamily: Fonts.body, color: colors.textMuted, fontStyle: 'italic',
      borderLeftWidth: 3, borderLeftColor: colors.primary,
      paddingLeft: Spacing.sm, marginBottom: Spacing.xs, lineHeight: 22,
    },

    transcriptRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    transcriptTs: { marginTop: 2 },
    speaker: { fontSize: 13, fontFamily: Fonts.displaySemiBold, color: colors.primary, marginBottom: 3 },
    transcriptText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 22 },
  });
}

type Styles = ReturnType<typeof createStyles>;

function buildSummaryCopyText(s: Summary, title: string, date: string, t: TFunction): string {
  const lines: string[] = [title, date, ''];
  lines.push(t('meeting.overview').toUpperCase(), s.overview, '');
  if (s.decisions.length > 0) {
    lines.push(t('meeting.decisions').toUpperCase());
    s.decisions.forEach((d) => lines.push(`• ${d}`));
    lines.push('');
  }
  if (s.action_items.length > 0) {
    lines.push(t('meeting.actionItems').toUpperCase());
    s.action_items.forEach((a) => {
      let row = `• ${a.task}`;
      if (a.assignee) row += ` (${a.assignee})`;
      if (a.deadline) row += ` — ${a.deadline}`;
      lines.push(row);
    });
    lines.push('');
  }
  if (s.topics.length > 0) {
    lines.push(t('meeting.topics').toUpperCase());
    lines.push(s.topics.join(', '), '');
  }
  if (s.key_quotes.length > 0) {
    lines.push(t('meeting.keyQuotes').toUpperCase());
    s.key_quotes.forEach((q) => lines.push(`"${q}"`));
    lines.push('');
  }
  return lines.join('\n').trim();
}

function buildTranscriptCopyText(tr: Transcript, title: string, date: string, t: TFunction): string {
  const lines: string[] = [title, date, ''];
  if (tr.segments && tr.segments.length > 0) {
    tr.segments.forEach((seg) => {
      const ts = formatTimestamp(seg.start);
      lines.push(seg.speaker ? `[${ts}] ${seg.speaker}` : `[${ts}]`);
      lines.push(seg.text, '');
    });
  } else {
    lines.push(tr.full_text);
  }
  return lines.join('\n').trim();
}
