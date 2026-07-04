import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, Animated, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { uploadMeeting, recordMeeting } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Fonts } from '@/constants/fonts';
import type { ColorScheme } from '@/constants/colors';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/aac'];
const MAX_BYTES = 25 * 1024 * 1024;

type Mode = 'summary' | 'transcript';
type Tab = 'record' | 'upload';
type RecState = 'idle' | 'recording' | 'paused' | 'stopped';

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function WaveformBars({ active, color }: { active: boolean; color: string }) {
  const bars = useRef(Array.from({ length: 7 }, () => new Animated.Value(10))).current;
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (active) {
      animsRef.current = bars.map((bar) => {
        const maxHeight = 25 + Math.random() * 35;
        const duration = 200 + Math.random() * 200;
        const anim = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: maxHeight, duration, useNativeDriver: false }),
            Animated.timing(bar, { toValue: 10, duration, useNativeDriver: false }),
          ])
        );
        anim.start();
        return anim;
      });
    } else {
      animsRef.current.forEach((a) => a.stop());
      animsRef.current = [];
      bars.forEach((bar) => bar.setValue(10));
    }
    return () => {
      animsRef.current.forEach((a) => a.stop());
    };
  }, [active, bars]);

  return (
    <View style={[waveformStyles.row, { opacity: active ? 1 : 0.3 }]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[waveformStyles.bar, { backgroundColor: color, height: bar }]}
        />
      ))}
    </View>
  );
}

const waveformStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 60 },
  bar: { width: 5, borderRadius: 2.5, marginHorizontal: 1.5 },
});

function PulseRing({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[pulseStyles.ring, { borderColor: color, transform: [{ scale }], opacity }]}
    />
  );
}

const pulseStyles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3,
  },
});

export default function UploadScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>('summary');
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

  async function handleMicPress() {
    if (recState === 'idle') {
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
    setRecordSaving(true);
    try {
      await recordMeeting({
        uri: recordedUri,
        mimeType: 'audio/m4a',
        title: title.trim() || undefined,
        mode,
        durationSeconds: durationSecs,
      });
      router.back();
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
    setFileUploading(true);
    setProgress(0);
    try {
      await uploadMeeting(file.uri, file.mimeType, setProgress, mode);
      router.back();
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

  function formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

    const stateLabel =
      recState === 'recording' ? t('newRecording.recording')
      : recState === 'paused' ? t('newRecording.paused')
      : t('newRecording.recordHint');
    const stateLabelColor =
      recState === 'recording' ? colors.error
      : recState === 'paused' ? colors.accent
      : colors.textMuted;

    return (
      <View style={s.recordCard}>
        <Text style={[s.duration, recState === 'idle' ? s.durationIdle : s.durationActive]}>
          {formatDuration(durationSecs)}
        </Text>

        <View style={s.waveformBox}>
          <WaveformBars active={recState === 'recording'} color={colors.primary} />
        </View>

        {recState !== 'stopped' ? (
          <>
            <View style={s.micArea}>
              {recState === 'recording' && <PulseRing color={colors.error} />}
              <TouchableOpacity
                style={[
                  s.micButton,
                  recState === 'idle' && s.micButtonIdle,
                  recState === 'recording' && s.micButtonRecording,
                  recState === 'paused' && s.micButtonPaused,
                ]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                accessibilityLabel={recState === 'idle' ? t('newRecording.startRecording') : t('newRecording.stop')}
              >
                <Ionicons
                  name={recState === 'idle' ? 'mic' : 'stop'}
                  size={36}
                  color={
                    recState === 'idle'
                      ? colors.primary
                      : recState === 'recording'
                        ? colors.error
                        : colors.accent
                  }
                />
              </TouchableOpacity>
            </View>

            <Text style={[s.stateLabel, { color: stateLabelColor }]}>{stateLabel}</Text>

            {(recState === 'recording' || recState === 'paused') && (
              <TouchableOpacity
                style={s.pausePill}
                onPress={recState === 'recording' ? handlePause : handleResume}
              >
                <Ionicons
                  name={recState === 'recording' ? 'pause' : 'play'}
                  size={14}
                  color={colors.text}
                />
                <Text style={s.pausePillText}>
                  {recState === 'recording' ? t('newRecording.pause') : t('newRecording.resume')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={s.stoppedSection}>
            <Text style={s.titleInputLabel}>{t('newRecording.titlePlaceholder')}</Text>
            <TextInput
              style={s.titleInput}
              placeholder={t('newRecording.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!recordSaving}
            />
            <View style={s.stoppedButtonsRow}>
              <TouchableOpacity style={s.discardButton} onPress={handleDiscard} disabled={recordSaving}>
                <Text style={s.discardButtonText}>{t('newRecording.discard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveButton, recordSaving && s.uploadButtonDisabled]}
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
        )}
      </View>
    );
  }

  function renderUploadTab() {
    return (
      <View style={s.uploadBody}>
        <TouchableOpacity style={s.picker} onPress={pickFile} disabled={fileUploading}>
          <Ionicons name="musical-notes-outline" size={48} color={colors.primary} style={s.pickerIcon} />
          <Text style={s.pickerLabel}>
            {file ? t('newRecording.changeFile') : t('newRecording.chooseFile')}
          </Text>
          <Text style={s.pickerHint}>{t('newRecording.fileFormats')}</Text>
        </TouchableOpacity>

        {file && (
          <View style={s.fileInfo}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={s.fileInfoBody}>
              <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
            </View>
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
          style={[s.uploadButton, (!file || fileUploading) && s.uploadButtonDisabled]}
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
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('newRecording.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.modeSelector}>
        <TouchableOpacity
          style={[s.modePill, mode === 'summary' && s.modePillActive]}
          onPress={() => setMode('summary')}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={mode === 'summary' ? '#fff' : colors.textMuted}
          />
          <Text style={[s.modePillText, mode === 'summary' && s.modePillTextActive]}>
            {t('newRecording.modeTranscribeAndSummarize')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modePill, mode === 'transcript' && s.modePillActive]}
          onPress={() => setMode('transcript')}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={mode === 'transcript' ? '#fff' : colors.textMuted}
          />
          <Text style={[s.modePillText, mode === 'transcript' && s.modePillTextActive]}>
            {t('newRecording.modeTranscribeOnly')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'record' && s.tabActive]} onPress={() => setTab('record')}>
          <Ionicons name="mic" size={16} color={tab === 'record' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, tab === 'record' && s.tabTextActive]}>{t('newRecording.tabRecord')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'upload' && s.tabActive]} onPress={() => setTab('upload')}>
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={tab === 'upload' ? colors.primary : colors.textMuted}
          />
          <Text style={[s.tabText, tab === 'upload' && s.tabTextActive]}>{t('newRecording.tabUpload')}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'record' ? renderRecordTab() : renderUploadTab()}
    </View>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16,
      backgroundColor: colors.bgSurface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontFamily: Fonts.display, color: colors.text },

    modeSelector: {
      flexDirection: 'row', backgroundColor: colors.bgSurface,
      borderRadius: 10, padding: 4, marginHorizontal: 20, marginTop: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    modePill: {
      flex: 1, paddingVertical: 10, borderRadius: 8,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    modePillActive: { backgroundColor: colors.primary },
    modePillText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.textMuted },
    modePillTextActive: { color: '#fff' },

    tabRow: {
      flexDirection: 'row', marginHorizontal: 20, marginTop: 20,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 12, marginRight: 24,
      borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: 14, fontFamily: Fonts.bodyMedium, color: colors.textMuted },
    tabTextActive: { color: colors.primary },

    // Upload tab
    uploadBody: { flex: 1, padding: 24 },
    picker: {
      borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
      borderRadius: 16, padding: 40, minHeight: 160,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      backgroundColor: colors.bgSurface,
    },
    pickerIcon: { marginBottom: 12 },
    pickerLabel: { fontSize: 16, fontFamily: Fonts.displaySemiBold, color: colors.text, marginBottom: 6 },
    pickerHint: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    fileInfo: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.bgSurface, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: colors.border, marginBottom: 20,
    },
    fileInfoBody: { flex: 1 },
    fileName: { fontSize: 14, color: colors.text, fontFamily: Fonts.bodyMedium, marginBottom: 2 },
    fileSize: { fontSize: 12, fontFamily: Fonts.body, color: colors.textMuted },
    progressSection: { marginBottom: 20 },
    progressTrack: {
      height: 8, backgroundColor: colors.bgElevated, borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
    progressText: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: colors.textMuted, textAlign: 'right', marginTop: 8 },
    uploadButton: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center',
    },
    uploadButtonDisabled: { opacity: 0.4 },
    uploadButtonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.displaySemiBold },

    // Record tab
    recordCard: {
      flex: 1, alignItems: 'center',
      backgroundColor: colors.bgSurface,
      borderRadius: 24, borderWidth: 1, borderColor: colors.border,
      marginHorizontal: 16, marginTop: 20, marginBottom: 24,
      paddingVertical: 32, paddingHorizontal: 24,
    },
    duration: {
      fontSize: 48, letterSpacing: -1, fontFamily: Fonts.display,
      fontVariant: ['tabular-nums'], marginTop: 8,
    },
    durationActive: { color: colors.text },
    durationIdle: { color: colors.textMuted },
    waveformBox: {
      height: 80, alignSelf: 'stretch',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary + '0A', borderRadius: 16,
      marginTop: 20,
    },
    micArea: {
      width: 96, height: 96, marginTop: 32,
      alignItems: 'center', justifyContent: 'center',
    },
    micButton: {
      width: 96, height: 96, borderRadius: 48, borderWidth: 3,
      alignItems: 'center', justifyContent: 'center',
    },
    micButtonIdle: { borderColor: colors.primary, backgroundColor: colors.primary + '1A' },
    micButtonRecording: { borderColor: colors.error, backgroundColor: colors.error + '33' },
    micButtonPaused: { borderColor: colors.accent, backgroundColor: colors.accent + '33' },
    stateLabel: { fontSize: 14, fontFamily: Fonts.body, marginTop: 16, textAlign: 'center' },
    pausePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border,
    },
    pausePillText: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text },
    stoppedSection: { width: '100%', marginTop: 24 },
    titleInputLabel: {
      fontSize: 13, fontFamily: Fonts.bodyMedium, color: colors.text, marginBottom: 8,
    },
    titleInput: {
      backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
      color: colors.text, fontSize: 15, fontFamily: Fonts.body, marginBottom: 16,
    },
    stoppedButtonsRow: { flexDirection: 'row', gap: 12 },
    discardButton: {
      flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    discardButtonText: { color: colors.textMuted, fontSize: 15, fontFamily: Fonts.bodyMedium },
    saveButton: {
      flex: 1, backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 15, fontFamily: Fonts.displaySemiBold },

    // Permission denied
    permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
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
      borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
    },
    settingsButtonText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bodyMedium },
  });
}
