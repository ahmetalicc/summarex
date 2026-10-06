import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Pressable, Linking, Platform, ScrollView, AppState, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, useAudioRecorderState, setAudioModeAsync, AudioModule } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import { uploadMeeting } from '@/lib/api';
import {
  MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, SPEECH_RECORDING_PRESET, RECORDING_STOP_BYTES, RECORDING_WARN_BYTES,
  estimateRecordingBytes, remainingRecordingSeconds, resolveAudioExtension, ensureUploadableFile,
  getFileSize, probeDurationSeconds,
} from '@/lib/audioFiles';
import { setActiveRecording, hasActiveRecording, confirmLeaveRecording } from '@/lib/recordingGuard';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import { Spacing, TAB_BAR_OFFSET } from '@/constants/tokens';
import { AppHeader } from '@/components/AppHeader';
import { HeroWaveform } from '@/components/HeroWaveform';
import { Button, Card, Input, Eyebrow } from '@/components/ui';
import type { ColorScheme } from '@/constants/colors';

// Only the server's allow-list; anything else (aac, 3gp, amr…) is rejected
// client-side in pickFile. Android's picker is opened wide instead (see pickFile).
const ACCEPTED_TYPES = [
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/opus', 'video/mp4',
];
const MIC_SIZE = 72;
// Pulse rings are pre-sized with static borderRadius (exactly half of width) and
// animate opacity only — scale transforms distort borderRadius on Android.
const RING_1 = MIC_SIZE + 24; // 96px
const RING_2 = MIC_SIZE + 48; // 120px
// If the recorder reports "not recording" this long after we last asked it to
// record (and the user didn't pause), the OS took the microphone (call, alarm…).
const INTERRUPTION_GRACE_MS = 1500;

type Mode = 'summary' | 'transcript';
type RecState = 'idle' | 'recording' | 'stopped';
type PickedFile = { uri: string; name: string; mimeType: string; size: number };

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function RecordUploadView({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Upload state
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const durationProbe = useRef<Promise<number | undefined> | null>(null);

  // Record state
  const audioRecorder = useAudioRecorder(SPEECH_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const [recState, setRecState] = useState<RecState>('idle');
  const [userPaused, setUserPaused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [backgroundLimited, setBackgroundLimited] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedMillis, setRecordedMillis] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [title, setTitle] = useState('');
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  const warnedRef = useRef(false);
  const stoppingRef = useRef(false);

  const ring1Opacity = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);

  const isRecording = recState === 'recording';
  const isPaused = isRecording && (userPaused || interrupted);
  const showMillis = recState === 'idle' ? 0 : isRecording ? recorderState.durationMillis : recordedMillis;
  const durationSecs = Math.floor(showMillis / 1000);

  useEffect(() => {
    if (isRecording && !isPaused) {
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
  }, [isRecording, isPaused, ring1Opacity, ring2Opacity]);

  const ring1Style = useAnimatedStyle(() => ({ opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2Opacity.value }));

  // After the user returns from system Settings, pick up a newly granted
  // microphone permission so the "Open Settings" card goes away on its own.
  useEffect(() => {
    if (!permissionDenied) return;
    const sub = AppState.addEventListener('change', async (next) => {
      if (next !== 'active') return;
      const status = await AudioModule.getRecordingPermissionsAsync();
      if (status.granted) setPermissionDenied(false);
    });
    return () => sub.remove();
  }, [permissionDenied]);

  // Size cap: warn at ~90 % of the server's 25 MB, stop (keeping the file) at 96 %.
  useEffect(() => {
    if (!isRecording) return;
    const bytes = estimateRecordingBytes(audioRecorder.getStatus().durationMillis);
    if (bytes >= RECORDING_WARN_BYTES && !warnedRef.current) {
      warnedRef.current = true;
      hapticNotification(NotificationFeedbackType.Warning);
    }
    if (bytes >= RECORDING_STOP_BYTES) void stopRecording(true);
  }, [recorderState.durationMillis, isRecording]);

  // Detect interruptions (phone call, alarm, another app taking the mic): the
  // recorder stops reporting isRecording although the user never paused.
  useEffect(() => {
    if (!isRecording || userPaused || recorderState.isRecording) {
      setInterrupted(false);
      return;
    }
    const id = setTimeout(() => {
      if (!audioRecorder.getStatus().isRecording) setInterrupted(true);
    }, INTERRUPTION_GRACE_MS);
    return () => clearTimeout(id);
  }, [isRecording, userPaused, recorderState.isRecording, audioRecorder]);

  // An unsaved recording (running, or stopped but not uploaded) is lost on leave.
  const discardRef = useRef<() => Promise<void>>(async () => {});
  const hasUnsaved = recState !== 'idle';
  useEffect(() => {
    if (!hasUnsaved) return;
    setActiveRecording({ discard: () => discardRef.current() });
    return () => setActiveRecording(null);
  }, [hasUnsaved]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!hasActiveRecording()) return false;
        confirmLeaveRecording(t, () => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        });
        return true;
      });
      return () => sub.remove();
    }, [t, router])
  );

  const s = useMemo(() => createStyles(colors), [colors]);

  const pageTitle = mode === 'transcript' ? t('transcribe.pageTitle') : t('summarize.pageTitle');
  const pageSubtitle = mode === 'transcript' ? t('transcribe.pageSubtitle') : t('summarize.pageSubtitle');
  const modeEyebrow = mode === 'transcript' ? t('tabs.transcribe') : t('tabs.summarize');

  function resetAll() {
    setRecState('idle'); setUserPaused(false); setInterrupted(false); setBackgroundLimited(false);
    setRecordedMillis(0); setTitle(''); setRecordedUri(null); setRecordError(null);
    setFile(null); setFileTitle(''); setFileDuration(null); setFileError(null); setProgress(null);
    durationProbe.current = null;
  }
  function goHome() { resetAll(); router.push('/(tabs)'); }

  async function resetAudioMode() {
    try {
      await setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
    } catch {}
  }

  // Microphone: ask on the first Record tap. Resolves false (and shows the
  // "Open Settings" card) only after the user actually denied.
  async function ensureMicPermission(): Promise<boolean> {
    let status = await AudioModule.getRecordingPermissionsAsync();
    if (!status.granted && status.canAskAgain) {
      status = await AudioModule.requestRecordingPermissionsAsync();
    }
    setPermissionDenied(!status.granted);
    return status.granted;
  }

  // Android 13+ refuses background recording (foreground service) without the
  // notification permission; fall back to foreground-only instead of failing.
  async function canRecordInBackground(): Promise<boolean> {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
    try {
      const status = await AudioModule.requestNotificationPermissionsAsync();
      return status.granted;
    } catch {
      return false;
    }
  }

  async function startRecording() {
    if (!(await ensureMicPermission())) return;
    const background = await canRecordInBackground();
    try {
      await setAudioModeAsync({
        allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: background,
      });
      // SDK 56 requires prepareToRecordAsync() before record() — skipping it
      // leaves recorder.uri null on some Android (Samsung) devices.
      try {
        await audioRecorder.prepareToRecordAsync();
      } catch {
        // Some encoders reject 22.05 kHz; 44.1 kHz mono at the same bitrate has
        // the same file size.
        await audioRecorder.prepareToRecordAsync({ sampleRate: 44100 });
      }
      audioRecorder.record();
    } catch (e: unknown) {
      await resetAudioMode();
      Alert.alert(t('common.error'), errorMessage(e));
      return;
    }
    warnedRef.current = false;
    setBackgroundLimited(!background);
    setUserPaused(false);
    setInterrupted(false);
    setRecordError(null);
    hapticNotification(NotificationFeedbackType.Success);
    setRecState('recording');
  }

  async function stopRecording(auto = false) {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setRecordBusy(true);
    try {
      const millis = audioRecorder.getStatus().durationMillis;
      await audioRecorder.stop();
      await resetAudioMode();
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
      setRecordedMillis(millis);
      setRecordedUri(capturedUri);
      setUserPaused(false);
      setInterrupted(false);
      setRecState('stopped');
      if (auto) {
        Alert.alert(
          t('newRecording.autoStoppedTitle'),
          t('newRecording.autoStopped', { max: MAX_UPLOAD_MB })
        );
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), errorMessage(e));
      setRecState('idle');
    } finally {
      stoppingRef.current = false;
      setRecordBusy(false);
    }
  }

  async function handleMicPress() {
    if (recordBusy) return;
    if (recState === 'idle') {
      setRecordBusy(true);
      try { await startRecording(); } finally { setRecordBusy(false); }
    } else if (recState === 'recording') {
      await stopRecording();
    }
  }

  async function handlePauseResume() {
    if (!isPaused) {
      audioRecorder.pause();
      setUserPaused(true);
      return;
    }
    try {
      // The OS may have deactivated the audio session during an interruption.
      await setAudioModeAsync({
        allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: !backgroundLimited,
      });
      audioRecorder.record();
      setUserPaused(false);
      setInterrupted(false);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), errorMessage(e));
    }
  }

  async function handleDiscard() {
    if (recState === 'recording') {
      try { await audioRecorder.stop(); } catch {}
      await resetAudioMode();
    }
    setRecState('idle'); setUserPaused(false); setInterrupted(false); setBackgroundLimited(false);
    setRecordedMillis(0); setTitle(''); setRecordedUri(null); setRecordError(null);
  }
  discardRef.current = handleDiscard;

  async function handleSaveRecording() {
    if (!recordedUri) {
      Alert.alert(t('newRecording.uploadFailed'), t('newRecording.noAudioCaptured'));
      return;
    }
    const size = getFileSize(recordedUri);
    if (size != null && size > MAX_UPLOAD_BYTES) {
      Alert.alert(t('newRecording.fileTooLargeTitle'), t('newRecording.fileTooLarge'));
      return;
    }
    setRecordSaving(true);
    setRecordError(null);
    try {
      // The preset records m4a; this only copies if the platform dropped the extension.
      const upload = await ensureUploadableFile(recordedUri, 'recording', 'm4a');
      await uploadMeeting({
        uri: upload.uri, mimeType: upload.mimeType,
        title: title.trim() || undefined, mode, durationSeconds: recordedMillis / 1000,
      });
      hapticNotification(NotificationFeedbackType.Success);
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      setRecordError(err.message);
      Alert.alert(err.status === 429 ? t('newRecording.limitReached') : t('newRecording.uploadFailed'), err.message);
    } finally {
      setRecordSaving(false);
    }
  }

  async function pickFile() {
    // Android's picker misfilters mixed MIME arrays on some devices — open it
    // wide there and rely on resolveAudioExtension instead.
    const pickerTypes = Platform.OS === 'android' ? ['*/*'] : ACCEPTED_TYPES;
    const result = await DocumentPicker.getDocumentAsync({ type: pickerTypes, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];

    const ext = resolveAudioExtension(asset.name, asset.mimeType);
    if (!ext) {
      Alert.alert(t('newRecording.unsupportedFormatTitle'), t('newRecording.unsupportedFormat'));
      return;
    }
    const size = asset.size ?? getFileSize(asset.uri) ?? 0;
    if (size > MAX_UPLOAD_BYTES) {
      Alert.alert(t('newRecording.fileTooLargeTitle'), t('newRecording.fileTooLarge'));
      return;
    }

    try {
      // The uploaded filename decides the format server-side, so make sure it
      // carries the right extension.
      const upload = await ensureUploadableFile(asset.uri, asset.name, ext);
      const probe = probeDurationSeconds(upload.uri);
      durationProbe.current = probe;
      setFileDuration(null);
      void probe.then((d) => { if (durationProbe.current === probe) setFileDuration(d ?? null); });
      setFile({ uri: upload.uri, name: asset.name, mimeType: upload.mimeType, size });
      setFileError(null);
      setProgress(null);
    } catch (e: unknown) {
      Alert.alert(t('newRecording.uploadFailed'), errorMessage(e));
    }
  }

  function clearFile() {
    setFile(null); setFileTitle(''); setFileDuration(null); setFileError(null); setProgress(null);
    durationProbe.current = null;
  }

  async function handleFileUpload() {
    if (!file) return;
    setFileUploading(true);
    setFileError(null);
    setProgress(0);
    try {
      const durationSeconds = (await durationProbe.current) ?? undefined;
      await uploadMeeting({
        uri: file.uri, mimeType: file.mimeType, title: fileTitle.trim() || undefined,
        mode, durationSeconds, onProgress: setProgress,
      });
      hapticNotification(NotificationFeedbackType.Success);
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      setFileError(err.message);
      Alert.alert(err.status === 429 ? t('newRecording.limitReached') : t('newRecording.uploadFailed'), err.message);
    } finally {
      setFileUploading(false);
    }
  }

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
            maxLength={120}
            containerStyle={{ marginTop: Spacing.sm }}
          />
          {recordError && <Text style={s.errorText}>{recordError}</Text>}
          <View style={s.buttonRow}>
            <View style={{ flex: 1 }}>
              <Button label={t('newRecording.discard')} variant="secondary" fullWidth onPress={() => void handleDiscard()} disabled={recordSaving} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={recordError ? t('newRecording.retryUpload') : t('newRecording.saveRecording')}
                variant="primary" fullWidth onPress={handleSaveRecording} isLoading={recordSaving}
              />
            </View>
          </View>
        </Card>
      );
    }

    const bytes = estimateRecordingBytes(showMillis);
    const nearLimit = bytes >= RECORDING_WARN_BYTES;
    const left = formatDuration(remainingRecordingSeconds(showMillis));

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
              disabled={recordBusy}
              accessibilityLabel={isRecording ? t('newRecording.stop') : t('newRecording.startRecording')}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={isRecording ? 30 : 32} color={colors.bg} />
            </Pressable>
          </View>

          <Text style={s.timer}>{formatDuration(durationSecs)}</Text>

          {isRecording ? (
            <>
              <Text style={s.recordStatus}>{isPaused ? t('newRecording.paused') : t('newRecording.recording')}</Text>
              {isPaused ? (
                <View style={[s.recordWave, { height: 40 }]} />
              ) : (
                <HeroWaveform height={40} barCount={48} style={s.recordWave} />
              )}
              <Text style={[s.sizeText, nearLimit && { color: colors.error }]}>
                {t('newRecording.sizeIndicator', { size: formatMb(bytes), max: MAX_UPLOAD_MB, left })}
              </Text>
              {nearLimit && (
                <Text style={s.warnText}>{t('newRecording.sizeWarning', { max: MAX_UPLOAD_MB, left })}</Text>
              )}
              {interrupted && <Text style={s.warnText}>{t('newRecording.interrupted')}</Text>}
              {backgroundLimited && <Text style={s.noteText}>{t('newRecording.backgroundLimited')}</Text>}
              <View style={{ marginTop: Spacing.md }}>
                <Button
                  label={isPaused ? t('newRecording.resume') : t('newRecording.pause')}
                  variant="secondary"
                  leftIcon={isPaused ? 'play' : 'pause'}
                  onPress={() => void handlePauseResume()}
                  disabled={recordBusy}
                />
              </View>
            </>
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
              <Text style={s.fileSize}>
                {fileDuration != null ? `${formatDuration(fileDuration)} · ` : ''}{formatBytes(file.size)}
              </Text>
            </View>
            {!fileUploading && (
              <Pressable onPress={clearFile} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        )}

        {file && (
          <Input
            label={t('newRecording.titlePlaceholder')}
            placeholder={t('newRecording.titlePlaceholder')}
            value={fileTitle}
            onChangeText={setFileTitle}
            editable={!fileUploading}
            maxLength={120}
            containerStyle={{ marginTop: Spacing.md }}
          />
        )}

        {progress !== null && (
          <View style={s.progressSection}>
            <View style={s.progressTrack}>
              <View style={[s.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{t('newRecording.uploading')} {progress}%</Text>
          </View>
        )}

        {fileError && <Text style={s.errorText}>{fileError}</Text>}

        {file && (
          <View style={{ marginTop: Spacing.md }}>
            <Button
              label={fileError ? t('newRecording.retryUpload') : t('newRecording.saveRecording')}
              variant="primary" fullWidth onPress={handleFileUpload} isLoading={fileUploading}
            />
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
    recordStatus: {
      fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.xs,
    },
    sizeText: {
      fontSize: 12, fontFamily: Fonts.mono, color: colors.textMuted,
      textAlign: 'center', marginTop: Spacing.sm,
    },
    warnText: {
      fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.error,
      textAlign: 'center', marginTop: Spacing.xs, lineHeight: 18,
    },
    noteText: {
      fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', marginTop: Spacing.xs, lineHeight: 17,
    },
    errorText: {
      fontSize: 13, fontFamily: Fonts.body, color: colors.error, marginTop: Spacing.sm, lineHeight: 18,
    },
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
