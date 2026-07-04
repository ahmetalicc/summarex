import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Pressable, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';
import type { Meeting, Transcript, Summary, MeetingStatus, ActionItem } from '@/lib/api';

const PROCESSING = new Set<MeetingStatus>(['queued', 'transcribing', 'summarizing']);

type Tab = 'transcript' | 'summary';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

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

function Spinner({ colors }: { colors: ColorScheme }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 44, height: 44, borderRadius: 22, borderWidth: 3,
          borderColor: colors.primary + '25',
          borderTopColor: colors.primary,
        },
        style,
      ]}
    />
  );
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }, style]} />;
}

function ProgressSteps({ status, colors, t }: { status: MeetingStatus; colors: ColorScheme; t: TFunction }) {
  const steps = [
    t('meeting.stepUploaded'),
    t('meeting.stepTranscribing'),
    t('meeting.stepSummarizing'),
    t('meeting.stepDone'),
  ];
  const currentIdx = status === 'summarizing' ? 2 : 1;

  return (
    <View style={{ marginTop: 24, gap: 14, alignSelf: 'stretch' }}>
      {steps.map((label, i) => {
        const completed = i < currentIdx;
        const current = i === currentIdx;
        return (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {current ? (
              <PulsingDot color={colors.primary} />
            ) : (
              <View
                style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: completed ? colors.primary : 'transparent',
                  borderWidth: completed ? 0 : 1.5,
                  borderColor: colors.border,
                }}
              />
            )}
            <Text
              style={{
                fontSize: 13,
                fontFamily: completed || current ? Fonts.bodyMedium : Fonts.body,
                color: completed || current ? colors.primary : colors.textMuted,
              }}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, language } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => createStyles(colors), [colors]);
  const STATUS_COLOR = useMemo(() => statusColors(colors), [colors]);

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

  const indicator = useSharedValue(1); // 0 = transcript, 1 = summary
  const indicatorStyle = useAnimatedStyle(() => {
    const innerWidth = (switcherWidth - 6) / 2;
    return {
      transform: [{ translateX: 3 + indicator.value * innerWidth }],
      width: innerWidth,
    };
  }, [switcherWidth]);

  function switchTab(next: Tab) {
    setTab(next);
    indicator.value = withSpring(next === 'transcript' ? 0 : 1, { damping: 20, stiffness: 250 });
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
        <Spinner colors={colors} />
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
  const statusColor = STATUS_COLOR[meeting.status];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backRow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          <Text style={s.backText}>{t('meeting.back')}</Text>
        </TouchableOpacity>

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
          <View style={[s.metaStatusPill, { backgroundColor: statusColor + '18' }]}>
            <Text style={[s.metaStatusText, { color: statusColor }]}>{t(STATUS_KEY[meeting.status])}</Text>
          </View>
          <Text style={s.metaText}>
            {formatDate(meeting.created_at, language)}
            {meeting.duration_seconds ? `  ·  ${formatDuration(meeting.duration_seconds)}` : ''}
          </Text>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity onPress={handleShare} disabled={sharing} style={s.actionPill}>
            {sharing
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Ionicons name="share-outline" size={14} color={colors.text} />}
            <Text style={s.actionPillText}>{t('common.share')}</Text>
          </TouchableOpacity>
          {isDone && (
            <TouchableOpacity onPress={handleRegenerate} disabled={regenerating} style={s.actionPill}>
              {regenerating
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Ionicons name="refresh-outline" size={14} color={colors.text} />}
              <Text style={s.actionPillText}>{t('meeting.regenerate')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} disabled={deleting} style={[s.actionPill, s.actionPillDanger]}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Ionicons name="trash-outline" size={14} color={colors.error} />}
            <Text style={[s.actionPillText, { color: colors.error }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Processing state */}
      {isProcessing && (
        <View style={s.processingWrap}>
          <View style={s.processingCard}>
            <Spinner colors={colors} />
            <Text style={s.processingTitle}>
              {meeting.status === 'queued' ? t('meeting.processingQueued') :
               meeting.status === 'transcribing' ? t('meeting.processingTranscribing') :
               t('meeting.processingSummarizing')}
            </Text>
            <Text style={s.processingSubtitle}>{t('meeting.processingSubtitle')}</Text>
            <ProgressSteps status={meeting.status} colors={colors} t={t} />
          </View>
        </View>
      )}

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
            <TouchableOpacity style={s.switcherTab} onPress={() => switchTab('transcript')}>
              <Text style={[s.switcherText, tab === 'transcript' && s.switcherTextActive]}>
                {t('meeting.transcript')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.switcherTab} onPress={() => switchTab('summary')}>
              <Text style={[s.switcherText, tab === 'summary' && s.switcherTextActive]}>
                {t('meeting.summary')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
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
            {tab === 'transcript' && <TranscriptTab transcript={transcript} s={s} t={t} />}
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
      <Section title={t('meeting.overview')} icon="document-text-outline" s={s}>
        <Text style={s.bodyText}>{summary.overview}</Text>
      </Section>
      {summary.decisions.length > 0 && (
        <Section title={t('meeting.decisions')} icon="git-branch-outline" s={s}>
          {summary.decisions.map((d, i) => <BulletItem key={i} text={d} s={s} />)}
        </Section>
      )}
      {summary.action_items.length > 0 && (
        <Section title={t('meeting.actionItems')} icon="checkmark-circle-outline" s={s}>
          {summary.action_items.map((a, i) => (
            <ActionBullet key={i} item={a} s={s} />
          ))}
        </Section>
      )}
      {summary.topics.length > 0 && (
        <Section title={t('meeting.topics')} icon="pricetag-outline" s={s}>
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
        <Section title={t('meeting.sentiment')} icon="heart-outline" s={s}>
          <Text style={s.bodyText}>{summary.sentiment}</Text>
        </Section>
      ) : null}
      {summary.key_quotes.length > 0 && (
        <Section title={t('meeting.keyQuotes')} icon="chatbubble-ellipses-outline" s={s}>
          {summary.key_quotes.map((q, i) => (
            <Text key={i} style={s.quote}>"{q}"</Text>
          ))}
        </Section>
      )}
    </View>
  );
}

function TranscriptTab({ transcript, s, t }: { transcript: Transcript | null; s: Styles; t: TFunction }) {
  if (!transcript) return <Text style={s.noContent}>{t('meeting.transcriptNotAvailable')}</Text>;
  return (
    <Section title={t('meeting.transcript')} icon="document-text-outline" s={s}>
      <Text style={s.transcriptText}>{transcript.full_text}</Text>
    </Section>
  );
}

function Section({ title, icon, children, s }: {
  title: string; icon: IoniconsName; children: React.ReactNode; s: Styles;
}) {
  return (
    <View>
      <View style={s.sectionHeaderRow}>
        <Ionicons name={icon} size={14} color={s.sectionTitle.color as string} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionRule} />
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

    header: {
      paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 12, alignSelf: 'flex-start' },
    backText: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted },
    titleText: { fontSize: 22, fontFamily: Fonts.display, color: colors.text },
    titleInput: {
      fontSize: 22, fontFamily: Fonts.display, color: colors.text,
      borderBottomWidth: 1, borderBottomColor: colors.primary, paddingBottom: 4,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    metaStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    metaStatusText: {
      fontSize: 10, fontFamily: Fonts.bodyMedium, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.3,
    },
    metaText: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    actionPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderColor: colors.border, borderRadius: 99,
      paddingHorizontal: 12, paddingVertical: 7,
      backgroundColor: colors.bg,
    },
    actionPillDanger: { borderColor: colors.error + '44' },
    actionPillText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: colors.text },

    processingWrap: { flex: 1, justifyContent: 'center', padding: 24 },
    processingCard: {
      alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      padding: 28,
    },
    processingTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text, marginTop: 20, textAlign: 'center' },
    processingSubtitle: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 6, textAlign: 'center' },

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
      backgroundColor: colors.bgElevated,
      borderRadius: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12, shadowRadius: 3,
      elevation: 2,
    },
    switcherTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
    switcherText: { fontSize: 14, fontFamily: Fonts.displaySemiBold, color: colors.textMuted },
    switcherTextActive: { color: colors.text },

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

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: {
      fontSize: 12, fontFamily: Fonts.displaySemiBold, color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    sectionRule: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    bodyText: { fontSize: 15, fontFamily: Fonts.body, color: colors.text, lineHeight: 24 },
    bulletRow: { flexDirection: 'row', marginBottom: 6 },
    bullet: { color: colors.primary, marginRight: 8, fontSize: 15 },
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
