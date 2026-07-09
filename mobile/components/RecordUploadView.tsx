import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, Pressable, Linking, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { uploadMeeting, recordMeeting } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, TAB_BAR_OFFSET } from '@/constants/tokens';
import { AppHeader } from '@/components/AppHeader';
import { HeroWaveform } from '@/components/HeroWaveform';
import { Button, Card, Input, Eyebrow } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';

const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg', 'audio/webm',
  'audio/aac', 'video/mp4', 'audio/3gpp', 'audio/amr', '*/*',
];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — server enforces its own limit
const MIC_SIZE = 72;
// Pulse rings are pre-sized with static borderRadius (exactly half of width) and
// animate opacity only — scale transforms distort borderRadius on Android.
const RING_1 = MIC_SIZE + 24; // 96px
const RING_2 = MIC_SIZE + 48; // 120px

type Mode = 'summary' | 'transcript';
type RecState = 'idle' | 'recording' | 'stopped';

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Android file managers often report 'application/octet-stream' for MP4/M4A —
// fall back to the extension so the server sees a real audio MIME type.
function resolveMimeType(name: string, reported: string | undefined): string {
  if (reported && reported !== 'application/octet-stream') return reported;
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: 'audio/mpeg', mp4: 'audio/mp4', m4a: 'audio/x-m4a', wav: 'audio/wav',
    ogg: 'audio/ogg', webm: 'audio/webm', aac: 'audio/aac', '3gp': 'audio/3gpp', amr: 'audio/amr',
  };
  return map[ext ?? ''] ?? 'audio/mpeg';
}

export function RecordUploadView({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Upload state
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  // Record state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recState, setRecState] = useState<RecState>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [durationSecs, setDurationSecs] = useState(0);
  const [title, setTitle] = useState('');
  const [recordSaving, setRecordSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ring1Opacity = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    if (recState === 'recording') {
      ring1Opacity.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 600 }), withTiming(0, { duration: 600 })), -1, false
      );
      ring2Opacity.value = withRepeat(
        withSequence(withTiming(0, { duration: 300 }), withTiming(0.4, { duration: 600 }), withTiming(0, { duration: 600 })), -1, false
      );
    } else {
      cancelAnimation(ring1Opacity);
      cancelAnimation(ring2Opacity);
      ring1Opacity.value = withTiming(0, { duration: 200 });
      ring2Opacity.value = withTiming(0, { duration: 200 });
    }
  }, [recState, ring1Opacity, ring2Opacity]);

  const ring1Style = useAnimatedStyle(() => ({ opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2Opacity.value }));

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) setPermissionDenied(true);
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const s = useMemo(() => createStyles(colors), [colors]);

  const pageTitle = mode === 'transcript' ? t('transcribe.pageTitle') : t('summarize.pageTitle');
  const pageSubtitle = mode === 'transcript' ? t('transcribe.pageSubtitle') : t('summarize.pageSubtitle');
  const modeEyebrow = mode === 'transcript' ? t('tabs.transcribe') : t('tabs.summarize');

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDurationSecs((d) => d + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function resetAll() {
    setRecState('idle'); setDurationSecs(0); setTitle('');
    setRecordedUri(null); setFile(null); setProgress(null);
  }
  function goHome() { resetAll(); router.push('/(tabs)'); }

  async function handleMicPress() {
    if (recState === 'idle') {
      setDurationSecs(0);
      try {
        // SDK 56 requires prepareToRecordAsync() before record() — skipping it
        // leaves recorder.uri null on some Android (Samsung) devices.
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      } catch (e: unknown) {
        Alert.alert(t('common.error'), String(e));
        return;
      }
      hapticNotification(NotificationFeedbackType.Success);
      setRecState('recording');
      startTimer();
    } else {
      stopTimer();
      await audioRecorder.stop();
      // Android needs a longer settle window before recorder.uri is populated.
      await new Promise((r) => setTimeout(r, Platform.OS === 'android' ? 600 : 150));
      const capturedUri = audioRecorder.uri;
      if (!capturedUri) {
        const msg = __DEV__
          ? `URI is null. recorder.uri = ${String(audioRecorder.uri)}`
          : t('newRecording.noAudioCaptured');
        Alert.alert(t('common.error'), msg);
        setRecState('idle');
        return;
      }
      hapticImpact(ImpactFeedbackStyle.Medium);
      setRecordedUri(capturedUri);
      setRecState('stopped');
    }
  }

  function handleDiscard() {
    setRecState('idle'); setDurationSecs(0); setTitle(''); setRecordedUri(null);
  }

  async function handleSaveRecording() {
    if (!recordedUri) {
      Alert.alert(t('newRecording.uploadFailed'), t('newRecording.noAudioCaptured'));
      return;
    }
    setRecordSaving(true);
    try {
      await recordMeeting({
        uri: recordedUri, mimeType: 'audio/m4a',
        title: title.trim() || undefined, mode, durationSeconds: durationSecs,
      });
      hapticNotification(NotificationFeedbackType.Success);
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      Alert.alert(err.status === 429 ? t('newRecording.limitReached') : t('newRecording.uploadFailed'), err.message);
    } finally {
      setRecordSaving(false);
    }
  }

  async function pickFile() {
    // Android's picker misfilters mixed MIME arrays on some devices — open it
    // wide there and rely on resolveMimeType + server validation instead.
    const pickerTypes = Platform.OS === 'android' ? ['*/*'] : ACCEPTED_TYPES;
    const result = await DocumentPicker.getDocumentAsync({ type: pickerTypes, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_BYTES) {
      Alert.alert(t('newRecording.fileTooLargeTitle'), t('newRecording.fileTooLarge'));
      return;
    }
    setFile({
      uri: asset.uri, name: asset.name,
      mimeType: resolveMimeType(asset.name, asset.mimeType), size: asset.size ?? 0,
    });
    setProgress(null);
  }

  async function handleFileUpload() {
    if (!file) return;
    setFileUploading(true);
    setProgress(0);
    try {
      await uploadMeeting(file.uri, file.mimeType, setProgress, mode);
      hapticNotification(NotificationFeedbackType.Success);
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      Alert.alert(err.status === 429 ? t('newRecording.limitReached') : t('newRecording.uploadFailed'), err.message);
    } finally {
      setFileUploading(false);
    }
  }

  const isRecording = recState === 'recording';

  function renderRecordCard() {
    if (permissionDenied) {
      return (
        <Card>
          <Eyebrow color={colors.primary}>{`01 · ${t('newRecording.tabRecord').toUpperCase()}`}</Eyebrow>
          <View style={s.permissionBody}>
            <Ionicons name="mic-off-outline" size={40} color={colors.error} />
            <Text style={s.permissionTitle}>{t('newRecording.permissionTitle')}</Text>
            <Text style={s.permissionSubtitle}>{t('newRecording.permissionSubtitle')}</Text>
            <View style={{ marginTop: Spacing.md }}>
              <Button label={t('newRecording.openSettings')} variant="secondary" onPress={() => Linking.openSettings()} />
            </View>
          </View>
        </Card>
      );
    }

    if (recState === 'stopped') {
      return (
        <Card>
          <Eyebrow color={colors.primary}>{`01 · ${t('newRecording.tabRecord').toUpperCase()}`}</Eyebrow>
          <View style={s.readyHeader}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={s.readyTitle}>{t('newRecording.recordingReady')}</Text>
          </View>
          <Text style={s.timer}>{formatDuration(durationSecs)}</Text>
          <Input
            label={t('newRecording.titlePlaceholder')}
            placeholder={t('newRecording.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
            editable={!recordSaving}
            containerStyle={{ marginTop: Spacing.sm }}
          />
          <View style={s.buttonRow}>
            <View style={{ flex: 1 }}>
              <Button label={t('newRecording.discard')} variant="secondary" fullWidth onPress={handleDiscard} disabled={recordSaving} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('newRecording.saveRecording')} variant="primary" fullWidth onPress={handleSaveRecording} isLoading={recordSaving} />
            </View>
          </View>
        </Card>
      );
    }

    return (
      <Card>
        <Eyebrow color={colors.primary}>{`01 · ${t('newRecording.tabRecord').toUpperCase()}`}</Eyebrow>
        <View style={s.recordBody}>
          <View style={s.micArea}>
            <Animated.View pointerEvents="none" style={[s.pulseRing1, ring1Style]} />
            <Animated.View pointerEvents="none" style={[s.pulseRing2, ring2Style]} />
            <Pressable
              style={[s.micButton, { backgroundColor: isRecording ? colors.error : colors.primary, shadowColor: isRecording ? colors.error : colors.primary }]}
              onPress={handleMicPress}
              accessibilityLabel={isRecording ? t('newRecording.stop') : t('newRecording.startRecording')}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={isRecording ? 30 : 32} color={colors.bg} />
            </Pressable>
          </View>

          <Text style={s.timer}>{formatDuration(durationSecs)}</Text>

          {isRecording ? (
            <HeroWaveform height={40} barCount={48} style={s.recordWave} />
          ) : (
            <Text style={s.recordHint}>{t('newRecording.recordHint')}</Text>
          )}
        </View>
      </Card>
    );
  }

  function renderUploadCard() {
    return (
      <Card>
        <Eyebrow color={colors.accent}>{`02 · ${t('newRecording.tabUpload').toUpperCase()}`}</Eyebrow>
        <Pressable
          style={[s.dropZone, { borderColor: colors.accent }]}
          onPress={pickFile}
          disabled={fileUploading}
        >
          <Ionicons name="cloud-upload-outline" size={48} color={colors.accent} />
          <Text style={s.dropTitle}>{t('newRecording.dropTitle')}</Text>
          <Text style={s.dropHint}>{t('newRecording.fileFormats')}</Text>
        </Pressable>

        <View style={s.browseRow}>
          <Button label={t('newRecording.browseFiles')} variant="secondary" leftIcon="folder-open-outline" onPress={pickFile} disabled={fileUploading} />
        </View>

        {file && (
          <View style={s.fileCard}>
            <Ionicons name="musical-notes" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
            </View>
            {!fileUploading && (
              <Pressable onPress={() => { setFile(null); setProgress(null); }} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        )}

        {progress !== null && (
          <View style={s.progressSection}>
            <View style={s.progressTrack}>
              <View style={[s.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{t('newRecording.uploading')} {progress}%</Text>
          </View>
        )}

        {file && (
          <View style={{ marginTop: Spacing.md }}>
            <Button label={t('newRecording.saveRecording')} variant="primary" fullWidth onPress={handleFileUpload} isLoading={fileUploading} />
          </View>
        )}
      </Card>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <AppHeader eyebrow={modeEyebrow} eyebrowColor={colors.primary} title={pageTitle} subtitle={pageSubtitle} />
        <View style={{ gap: Spacing.md, marginTop: Spacing.xl }}>
          {renderRecordCard()}
          {renderUploadCard()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: TAB_BAR_OFFSET },

    recordBody: { alignItems: 'center', paddingTop: Spacing.lg },
    micArea: {
      width: RING_2, height: RING_2,
      alignItems: 'center', justifyContent: 'center',
    },
    pulseRing1: {
      position: 'absolute',
      top: (RING_2 - RING_1) / 2, left: (RING_2 - RING_1) / 2,
      width: RING_1, height: RING_1, borderRadius: RING_1 / 2,
      borderWidth: 2, borderColor: colors.error,
    },
    pulseRing2: {
      position: 'absolute', top: 0, left: 0,
      width: RING_2, height: RING_2, borderRadius: RING_2 / 2,
      borderWidth: 1.5, borderColor: colors.error,
    },
    micButton: {
      width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2,
      alignItems: 'center', justifyContent: 'center',
      ...Platform.select({
        ios: { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
        android: { elevation: 8 },
      }),
    },
    timer: {
      fontSize: 48, fontFamily: Fonts.monoBold, color: colors.text,
      letterSpacing: -1, fontVariant: ['tabular-nums'],
      textAlign: 'center', marginTop: Spacing.md,
    },
    recordWave: { alignSelf: 'stretch', marginTop: Spacing.md },
    recordHint: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', marginTop: Spacing.md,
    },

    readyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
    readyTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text },
    buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },

    dropZone: {
      borderStyle: 'dashed', borderWidth: 1, borderRadius: 20,
      minHeight: 180, marginTop: Spacing.md,
      alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg,
    },
    dropTitle: { fontSize: 17, fontFamily: Fonts.display, color: colors.text, marginTop: Spacing.xs },
    dropHint: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, textAlign: 'center' },
    browseRow: { alignItems: 'center', marginTop: Spacing.md },

    fileCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.bgElevated,
      borderWidth: 1, borderColor: colors.border, borderRadius: 14,
      padding: Spacing.md, marginTop: Spacing.md,
    },
    fileName: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.text },
    fileSize: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted, marginTop: 2 },

    progressSection: { marginTop: Spacing.md },
    progressTrack: {
      height: 6, borderRadius: 3, backgroundColor: colors.bgElevated,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    progressBar: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
    progressText: { fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted, textAlign: 'right', marginTop: 6 },

    permissionBody: { alignItems: 'center', paddingTop: Spacing.lg },
    permissionTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text, marginTop: Spacing.md, textAlign: 'center' },
    permissionSubtitle: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, marginTop: Spacing.xs, textAlign: 'center', lineHeight: 18 },
  });
}
