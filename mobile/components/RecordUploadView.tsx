import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, Linking, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
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

const ACCEPTED_TYPES = [
  'audio/mpeg',       // MP3
  'audio/mp4',        // M4A / AAC in MP4 container
  'audio/x-m4a',      // M4A alternate MIME
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'video/mp4',        // MP4 file selected as video — still audio content
  'audio/3gpp',       // Android native recording format
  'audio/amr',        // AMR (some Android devices)
  '*/*',              // fallback: let the server validate if MIME is unknown
];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB — server enforces its own limit
const MIC_SIZE = 96;
// Pulse rings are pre-sized with static borderRadius (exactly half of width) and
// animate opacity only — scale transforms distort borderRadius on Android,
// which rendered the ring as an octagon.
const RING_1 = MIC_SIZE + 28; // 124px
const RING_2 = MIC_SIZE + 56; // 152px
const RECORDING_RED = '#DC2626';

type Mode = 'summary' | 'transcript';
type Tab = 'record' | 'upload';
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
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/x-m4a',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
    aac: 'audio/aac',
    '3gp': 'audio/3gpp',
    amr: 'audio/amr',
  };
  return map[ext ?? ''] ?? 'audio/mpeg';
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

export function RecordUploadView({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

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

  // Every mode-specific surface derives from this one color: transcribe is
  // orange, summarize is green.
  const modeColor = mode === 'transcript' ? colors.accent : colors.primary;

  const ring1Opacity = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    if (recState === 'recording') {
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ), -1, false
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 300 }),
          withTiming(0.4, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ), -1, false
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

  const s = useMemo(() => createStyles(colors, modeColor), [colors, modeColor]);

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
      hapticImpact(ImpactFeedbackStyle.Medium);
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
      hapticNotification(NotificationFeedbackType.Success);
      setRecordedUri(capturedUri);
      setRecState('stopped');
    }
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
    hapticImpact();
    setRecordSaving(true);
    try {
      await recordMeeting({
        uri: recordedUri,
        mimeType: 'audio/m4a',
        title: title.trim() || undefined,
        mode,
        durationSeconds: durationSecs,
      });
      hapticNotification(NotificationFeedbackType.Success);
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
    // Android's picker misfilters mixed MIME arrays on some devices — open it
    // wide there and rely on resolveMimeType + server validation instead.
    const pickerTypes = Platform.OS === 'android' ? ['*/*'] : ACCEPTED_TYPES;
    const result = await DocumentPicker.getDocumentAsync({
      type: pickerTypes,
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
      mimeType: resolveMimeType(asset.name, asset.mimeType),
      size: asset.size ?? 0,
    });
    setProgress(null);
  }

  async function handleFileUpload() {
    if (!file) return;
    hapticImpact();
    setFileUploading(true);
    setProgress(0);
    try {
      await uploadMeeting(file.uri, file.mimeType, setProgress, mode);
      hapticNotification(NotificationFeedbackType.Success);
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
    const buttonColor = isRecording ? RECORDING_RED : modeColor;

    return (
      <View style={s.recordArea}>
        <View style={s.micArea}>
          <Animated.View pointerEvents="none" style={[s.pulseRing1, ring1Style]} />
          <Animated.View pointerEvents="none" style={[s.pulseRing2, ring2Style]} />
          <TouchableOpacity
            style={[s.micButton, { backgroundColor: buttonColor, shadowColor: buttonColor }]}
            onPress={handleMicPress}
            activeOpacity={0.85}
            accessibilityLabel={isIdle ? t('newRecording.startRecording') : t('newRecording.stop')}
          >
            <Ionicons name={isIdle ? 'mic' : 'stop'} size={isIdle ? 36 : 32} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={s.duration}>{formatDuration(durationSecs)}</Text>

        <View style={s.hintCard}>
          {isIdle ? (
            <>
              <View style={s.dotsRow}>
                {Array.from({ length: 18 }, (_, i) => (
                  <View key={i} style={s.dot} />
                ))}
              </View>
              <Text style={s.hintText}>{t('newRecording.recordHint')}</Text>
            </>
          ) : (
            <>
              <View style={s.waveformRow}>
                {Array.from({ length: 8 }, (_, i) => (
                  <WaveBar key={i} index={i} active={isRecording} color={modeColor} />
                ))}
              </View>
              <Text style={s.hintText}>
                {t('newRecording.recording') + ' — ' + t('newRecording.tapToStop')}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  function renderUploadTab() {
    return (
      <View style={s.uploadBody}>
        <TouchableOpacity style={s.dropZone} onPress={pickFile} disabled={fileUploading} activeOpacity={0.8}>
          <View style={s.dropZoneIconWrap}>
            <Ionicons name="arrow-up-outline" size={24} color={modeColor} />
          </View>
          <Text style={s.dropZoneTitle}>{t('newRecording.dropTitle')}</Text>
          <Text style={s.dropZoneHint}>{t('newRecording.fileFormats')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.browseButton, fileUploading && s.buttonDisabled]}
          onPress={pickFile}
          disabled={fileUploading}
        >
          <Text style={s.browseButtonText}>{t('newRecording.browseFiles')}</Text>
        </TouchableOpacity>

        {file && (
          <View style={s.fileCard}>
            <Ionicons name="musical-notes" size={20} color={modeColor} />
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
        <View style={s.modeBadge}>
          <Ionicons
            name={mode === 'transcript' ? 'document-text-outline' : 'sparkles-outline'}
            size={12}
            color={modeColor}
          />
          <Text style={s.modeBadgeText}>
            {mode === 'transcript' ? t('tabs.transcribe') : t('tabs.summarize')}
          </Text>
        </View>
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

function createStyles(colors: ColorScheme, modeColor: string) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { flexGrow: 1, paddingBottom: 32 },

    header: { paddingTop: 56, paddingHorizontal: 20 },
    pageTitle: { fontSize: 24, fontFamily: Fonts.display, color: colors.text },
    pageSubtitle: { fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted, marginTop: 4 },
    modeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      marginTop: 8, alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
      backgroundColor: modeColor + '15',
    },
    modeBadgeText: {
      fontSize: 11, fontFamily: Fonts.bodyMedium,
      color: modeColor, textTransform: 'uppercase', letterSpacing: 0.4,
    },

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
    tabPillActive: { backgroundColor: modeColor },
    tabPillText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.textMuted },
    tabPillTextActive: { color: '#fff' },

    // Record tab
    recordArea: { flex: 1, alignItems: 'center', paddingTop: 48 },
    micArea: {
      width: RING_2, height: RING_2,
      alignItems: 'center', justifyContent: 'center',
    },
    pulseRing1: {
      position: 'absolute',
      top: (RING_2 - RING_1) / 2,
      left: (RING_2 - RING_1) / 2,
      width: RING_1, height: RING_1,
      borderRadius: RING_1 / 2,
      borderWidth: 2,
      borderColor: colors.error,
    },
    pulseRing2: {
      position: 'absolute',
      top: 0, left: 0,
      width: RING_2, height: RING_2,
      borderRadius: RING_2 / 2,
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    // backgroundColor + shadowColor are set inline — they follow the mode color
    // while idle and switch to red while recording.
    micButton: {
      width: MIC_SIZE, height: MIC_SIZE, borderRadius: MIC_SIZE / 2,
      borderWidth: 0,
      alignItems: 'center', justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
        },
        android: { elevation: 8 },
      }),
    },
    duration: {
      fontSize: 52, fontFamily: Fonts.display, color: colors.text,
      letterSpacing: -2, fontVariant: ['tabular-nums'],
      textAlign: 'center', marginTop: 16,
    },
    hintCard: {
      alignSelf: 'stretch',
      backgroundColor: colors.bgSurface,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      padding: 20, marginTop: 32, marginHorizontal: 20,
      alignItems: 'center',
    },
    dotsRow: {
      flexDirection: 'row', justifyContent: 'center', gap: 5,
      marginBottom: 12,
    },
    dot: {
      width: 4, height: 4, borderRadius: 2,
      backgroundColor: modeColor + '60',
    },
    waveformRow: {
      flexDirection: 'row', alignItems: 'center', gap: 4, height: 60,
      marginBottom: 12,
    },
    hintText: {
      fontSize: 14, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'center',
    },

    // Stopped state
    readyCard: {
      backgroundColor: colors.bgSurface,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      marginHorizontal: 20, marginTop: 24, padding: 20,
    },
    readyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    readyTitle: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text },
    readyDuration: {
      fontSize: 32, fontFamily: Fonts.display, color: modeColor,
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
      flex: 1, backgroundColor: modeColor, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },
    buttonDisabled: { opacity: 0.4 },

    // Upload tab
    uploadBody: { flex: 1, padding: 20 },
    dropZone: {
      backgroundColor: colors.bgSurface,
      borderStyle: 'dashed', borderWidth: 1.5, borderColor: modeColor + '60',
      borderRadius: 20, minHeight: 200,
      padding: 24,
      alignItems: 'center', justifyContent: 'center',
    },
    dropZoneIconWrap: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: modeColor + '15',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    dropZoneTitle: {
      fontSize: 17, fontFamily: Fonts.display, color: colors.text,
      marginBottom: 6,
    },
    dropZoneHint: { fontSize: 13, fontFamily: Fonts.body, color: colors.textMuted },
    browseButton: {
      backgroundColor: modeColor,
      borderRadius: 99,
      paddingHorizontal: 28, paddingVertical: 13,
      alignSelf: 'center',
      marginTop: 20,
    },
    browseButtonText: { fontSize: 15, fontFamily: Fonts.displaySemiBold, color: '#fff' },
    fileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.bgSurface,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, padding: 14, marginTop: 20,
    },
    fileName: { flex: 1, fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.text },
    fileSize: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    progressSection: { marginTop: 16 },
    progressTrack: {
      height: 6, borderRadius: 3, backgroundColor: colors.bg,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    progressBar: { height: '100%', backgroundColor: modeColor, borderRadius: 3 },
    progressText: {
      fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted,
      textAlign: 'right', marginTop: 6,
    },
    uploadButton: {
      backgroundColor: modeColor, borderRadius: 99,
      paddingVertical: 15, alignItems: 'center',
      marginTop: 16,
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
      marginTop: 20, backgroundColor: modeColor,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    settingsButtonText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bodyMedium },
  });
}
