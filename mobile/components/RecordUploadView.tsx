import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, Linking, Platform, ScrollView, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withDelay, cancelAnimation, Easing,
} from 'react-native-reanimated';
import { uploadMeeting, recordMeeting } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/aac'];
const MAX_BYTES = 25 * 1024 * 1024;
const MIC_SIZE = 96;

type Mode = 'summary' | 'transcript';
type Tab = 'record' | 'upload';
type RecState = 'idle' | 'recording' | 'paused' | 'stopped';

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

function WaveBar({ active, color, index }: { active: boolean; color: string; index: number }) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (active) {
      const peak = 28 + Math.random() * 32;
      const duration = 200 + Math.random() * 300;
      height.value = withDelay(
        index * 50,
        withRepeat(
          withSequence(
            withTiming(peak, { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(8, { duration, easing: Easing.inOut(Easing.quad) })
          ),
          -1
        )
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(8, { duration: 180 });
    }
    return () => cancelAnimation(height);
  }, [active, height, index]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[{ width: 5, borderRadius: 2.5, backgroundColor: color }, style]}
    />
  );
}

function PulseRing({ color }: { color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
      -1
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * (136 / MIC_SIZE - 1) }],
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2,
          borderWidth: 2, borderColor: color + '50',
        },
        style,
      ]}
    />
  );
}

export function RecordUploadView({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  const [tab, setTab] = useState<Tab>('record');

  // Upload tab state
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  // Record tab state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recState, setRecState] = useState<RecState>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [durationSecs, setDurationSecs] = useState(0);
  const [title, setTitle] = useState('');
  const [recordSaving, setRecordSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDurationSecs((d) => d + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetAll() {
    setRecState('idle');
    setDurationSecs(0);
    setTitle('');
    setRecordedUri(null);
    setFile(null);
    setProgress(null);
  }

  function goHome() {
    resetAll();
    router.push('/(tabs)');
  }

  async function handleMicPress() {
    if (recState === 'idle') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDurationSecs(0);
      audioRecorder.record();
      setRecState('recording');
      startTimer();
    } else {
      stopTimer();
      await audioRecorder.stop();
      await new Promise((r) => setTimeout(r, 150));
      const capturedUri = audioRecorder.uri;
      if (!capturedUri) {
        Alert.alert(t('common.error'), t('newRecording.noAudioCaptured'));
        setRecState('idle');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRecordedUri(capturedUri);
      setRecState('stopped');
    }
  }

  function handlePause() {
    stopTimer();
    audioRecorder.pause();
    setRecState('paused');
  }

  function handleResume() {
    audioRecorder.record();
    startTimer();
    setRecState('recording');
  }

  function handleDiscard() {
    setRecState('idle');
    setDurationSecs(0);
    setTitle('');
    setRecordedUri(null);
  }

  async function handleSaveRecording() {
    if (!recordedUri) {
      Alert.alert(t('newRecording.uploadFailed'), t('newRecording.noAudioCaptured'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecordSaving(true);
    try {
      await recordMeeting({
        uri: recordedUri,
        mimeType: 'audio/m4a',
        title: title.trim() || undefined,
        mode,
        durationSeconds: durationSecs,
      });
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 429) {
        Alert.alert(t('newRecording.limitReached'), err.message);
      } else {
        Alert.alert(t('newRecording.uploadFailed'), err.message);
      }
    } finally {
      setRecordSaving(false);
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_BYTES) {
      Alert.alert(t('newRecording.fileTooLargeTitle'), t('newRecording.fileTooLarge'));
      return;
    }
    setFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'audio/mpeg',
      size: asset.size ?? 0,
    });
    setProgress(null);
  }

  async function handleFileUpload() {
    if (!file) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFileUploading(true);
    setProgress(0);
    try {
      await uploadMeeting(file.uri, file.mimeType, setProgress, mode);
      goHome();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 429) {
        Alert.alert(t('newRecording.limitReached'), err.message);
      } else {
        Alert.alert(t('newRecording.uploadFailed'), err.message);
      }
    } finally {
      setFileUploading(false);
    }
  }

  function renderRecordTab() {
    if (permissionDenied) {
      return (
        <View style={s.permissionContainer}>
          <Ionicons name="mic-off-outline" size={48} color={colors.error} />
          <Text style={s.permissionTitle}>{t('newRecording.permissionTitle')}</Text>
          <Text style={s.permissionSubtitle}>{t('newRecording.permissionSubtitle')}</Text>
          <TouchableOpacity style={s.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={s.settingsButtonText}>{t('newRecording.openSettings')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (recState === 'stopped') {
      return (
        <View style={s.readyCard}>
          <View style={s.readyHeader}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={s.readyTitle}>{t('newRecording.recordingReady')}</Text>
          </View>
          <Text style={s.readyDuration}>{formatDuration(durationSecs)}</Text>
          <Text style={s.titleInputLabel}>{t('newRecording.titlePlaceholder')}</Text>
          <TextInput
            style={s.titleInput}
            placeholder={t('newRecording.titlePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            editable={!recordSaving}
          />
          <View style={s.readyButtonsRow}>
            <TouchableOpacity style={s.discardButton} onPress={handleDiscard} disabled={recordSaving}>
              <Text style={s.discardButtonText}>{t('newRecording.discard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveButton, recordSaving && s.buttonDisabled]}
              onPress={handleSaveRecording}
              disabled={recordSaving}
            >
              {recordSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.saveButtonText}>{t('newRecording.saveRecording')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const isIdle = recState === 'idle';
    const isRecording = recState === 'recording';
    const isPaused = recState === 'paused';
    const stateColor = isRecording ? colors.error : colors.accent;

    return (
      <View style={s.recordArea}>
        {isIdle ? (
          <Text style={s.recordHint}>{t('newRecording.recordHint')}</Text>
        ) : (
          <>
            <Text style={s.duration}>{formatDuration(durationSecs)}</Text>
            <View style={[s.waveformBox, { width: screenWidth - 80 }]}>
              <View style={s.waveformRow}>
                {Array.from({ length: 8 }, (_, i) => (
                  <WaveBar key={i} index={i} active={isRecording} color={colors.primary} />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={s.micArea}>
          {isRecording && <PulseRing color={colors.error} />}
          <TouchableOpacity
            style={[
              s.micButton,
              isIdle && s.micButtonIdle,
              isRecording && { borderColor: colors.error, backgroundColor: colors.error + '15' },
              isPaused && { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
            ]}
            onPress={handleMicPress}
            activeOpacity={0.85}
            accessibilityLabel={isIdle ? t('newRecording.startRecording') : t('newRecording.stop')}
          >
            <Ionicons
              name={isIdle ? 'mic' : 'stop'}
              size={40}
              color={isIdle ? colors.primary : stateColor}
            />
          </TouchableOpacity>
        </View>

        {isIdle ? (
          <Text style={s.tapToStart}>{t('newRecording.startRecording')}</Text>
        ) : (
          <Text style={[s.stateLabel, { color: stateColor }]}>
            {isRecording ? t('newRecording.recording') : t('newRecording.paused')}
          </Text>
        )}

        {!isIdle && (
          <TouchableOpacity
            style={s.pausePill}
            onPress={isRecording ? handlePause : handleResume}
          >
            <Ionicons
              name={isRecording ? 'pause-outline' : 'play'}
              size={14}
              color={colors.text}
            />
            <Text style={s.pausePillText}>
              {isRecording ? t('newRecording.pause') : t('newRecording.resume')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderUploadTab() {
    return (
      <View style={s.uploadBody}>
        <TouchableOpacity style={s.dropZone} onPress={pickFile} disabled={fileUploading} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={48} color={colors.primary + '80'} />
          <Text style={s.dropZoneTitle}>
            {file ? t('newRecording.changeFile') : t('newRecording.chooseFile')}
          </Text>
          <Text style={s.dropZoneHint}>{t('newRecording.fileFormats')}</Text>
        </TouchableOpacity>

        {file && (
          <View style={s.fileCard}>
            <Ionicons name="musical-notes" size={20} color={colors.primary} />
            <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
            <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
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

        <TouchableOpacity
          style={[s.uploadButton, (!file || fileUploading) && s.buttonDisabled]}
          onPress={handleFileUpload}
          disabled={!file || fileUploading}
        >
          {fileUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.uploadButtonText}>{t('newRecording.upload')}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <Text style={s.pageTitle}>{pageTitle}</Text>
        <Text style={s.pageSubtitle}>{pageSubtitle}</Text>
      </View>

      <View style={s.tabSwitcher}>
        <TouchableOpacity
          style={[s.tabPill, tab === 'record' && s.tabPillActive]}
          onPress={() => setTab('record')}
        >
          <Ionicons name="mic-outline" size={16} color={tab === 'record' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabPillText, tab === 'record' && s.tabPillTextActive]}>
            {t('newRecording.tabRecord')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabPill, tab === 'upload' && s.tabPillActive]}
          onPress={() => setTab('upload')}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={tab === 'upload' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabPillText, tab === 'upload' && s.tabPillTextActive]}>
            {t('newRecording.tabUpload')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'record' ? renderRecordTab() : renderUploadTab()}
    </ScrollView>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { flexGrow: 1, paddingBottom: 32 },

    header: { paddingTop: 56, paddingHorizontal: 20 },
    pageTitle: { fontSize: 24, fontFamily: Fonts.display, color: colors.text },
    pageSubtitle: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 4 },

    tabSwitcher: {
      flexDirection: 'row',
      marginHorizontal: 20, marginTop: 20,
      backgroundColor: colors.bgSurface,
      borderRadius: 14, padding: 4,
      borderWidth: 1, borderColor: colors.border,
    },
    tabPill: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    tabPillActive: { backgroundColor: colors.primary },
    tabPillText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.textMuted },
    tabPillTextActive: { color: '#fff' },

    // Record tab
    recordArea: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
    recordHint: {
      fontSize: 15, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center', maxWidth: 260, marginBottom: 40,
    },
    duration: {
      fontSize: 52, fontFamily: Fonts.display, color: colors.text,
      letterSpacing: -2, fontVariant: ['tabular-nums'],
      textAlign: 'center', marginBottom: 24,
    },
    waveformBox: {
      height: 80, borderRadius: 16,
      backgroundColor: colors.primary + '08',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 36,
    },
    waveformRow: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 60,
    },
    micArea: {
      width: MIC_SIZE, height: MIC_SIZE,
      alignItems: 'center', justifyContent: 'center',
    },
    micButton: {
      width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2,
      borderWidth: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    micButtonIdle: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '12',
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
        },
        android: { elevation: 4 },
      }),
    },
    tapToStart: {
      fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.textMuted,
      textAlign: 'center', marginTop: 16,
    },
    stateLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium, marginTop: 12, textAlign: 'center' },
    pausePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.bgSurface,
    },
    pausePillText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text },

    // Stopped state
    readyCard: {
      backgroundColor: colors.bgSurface,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      marginHorizontal: 20, marginTop: 24, padding: 20,
    },
    readyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    readyTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text },
    readyDuration: {
      fontSize: 32, fontFamily: Fonts.display, color: colors.primary,
      textAlign: 'center', marginVertical: 16,
      fontVariant: ['tabular-nums'],
    },
    titleInputLabel: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text, marginBottom: 8 },
    titleInput: {
      backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
      color: colors.text, fontSize: 15, fontFamily: Fonts.body,
    },
    readyButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    discardButton: {
      flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    discardButtonText: { color: colors.textMuted, fontSize: 15, fontFamily: Fonts.bodyMedium },
    saveButton: {
      flex: 1, backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },
    buttonDisabled: { opacity: 0.4 },

    // Upload tab
    uploadBody: { flex: 1, padding: 20 },
    dropZone: {
      borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 20, minHeight: 180,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16, gap: 6,
    },
    dropZoneTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text, marginTop: 8 },
    dropZoneHint: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted },
    fileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, marginBottom: 16,
    },
    fileName: { flex: 1, fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.text },
    fileSize: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    progressSection: { marginBottom: 16 },
    progressTrack: {
      height: 6, borderRadius: 3, backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    progressBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
    progressText: {
      fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'right', marginTop: 6,
    },
    uploadButton: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 15, alignItems: 'center',
    },
    uploadButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },

    // Permission denied
    permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
    permissionTitle: {
      fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text,
      marginTop: 16, textAlign: 'center',
    },
    permissionSubtitle: {
      fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 8,
      textAlign: 'center', lineHeight: 18,
    },
    settingsButton: {
      marginTop: 20, backgroundColor: colors.primary,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    settingsButtonText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bodyMedium },
  });
}
