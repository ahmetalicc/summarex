import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, Animated, Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { uploadMeeting, recordMeeting } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
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
  const bars = useRef(Array.from({ length: 5 }, () => new Animated.Value(8))).current;
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (active) {
      animsRef.current = bars.map((bar) => {
        const maxHeight = 20 + Math.random() * 30;
        const duration = 200 + Math.random() * 200;
        const anim = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: maxHeight, duration, useNativeDriver: false }),
            Animated.timing(bar, { toValue: 8, duration, useNativeDriver: false }),
          ])
        );
        anim.start();
        return anim;
      });
    } else {
      animsRef.current.forEach((a) => a.stop());
      animsRef.current = [];
      bars.forEach((bar) => bar.setValue(8));
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
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 50 },
  bar: { width: 4, borderRadius: 2, margin: 2 },
});

export default function UploadScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [mode, setMode] = useState<Mode>('summary');
  const [tab, setTab] = useState<Tab>('record');

  // Upload tab state
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  // Record tab state
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recState, setRecState] = useState<RecState>('idle');
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
  }

  async function handleSaveRecording() {
    if (!audioRecorder.uri) return;
    setRecordSaving(true);
    try {
      await recordMeeting({
        uri: audioRecorder.uri,
        mimeType: 'audio/m4a',
        title: title.trim() || undefined,
        mode,
        durationSeconds: durationSecs,
      });
      router.back();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 429) {
        Alert.alert('Monthly limit reached', err.message);
      } else {
        Alert.alert('Upload failed', err.message);
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
      Alert.alert('File too large', 'Maximum file size is 25 MB.');
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
      await uploadMeeting(file.uri, file.name, file.mimeType, setProgress, mode);
      router.back();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 429) {
        Alert.alert('Monthly limit reached', err.message);
      } else {
        Alert.alert('Upload failed', err.message);
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
          <Text style={s.permissionTitle}>Microphone permission required</Text>
          <Text style={s.permissionSubtitle}>
            Please enable microphone access in your device settings.
          </Text>
          <TouchableOpacity style={s.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={s.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.recordContainer}>
        <WaveformBars active={recState === 'recording'} color={colors.primary} />

        <Text style={[s.duration, recState === 'recording' ? s.durationActive : s.durationIdle]}>
          {formatDuration(durationSecs)}
        </Text>

        {recState !== 'stopped' ? (
          <>
            <TouchableOpacity
              style={[
                s.micButton,
                recState === 'idle' && s.micButtonIdle,
                recState === 'recording' && s.micButtonRecording,
                recState === 'paused' && s.micButtonPaused,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.85}
            >
              <Ionicons
                name={recState === 'idle' ? 'mic' : 'stop'}
                size={32}
                color={
                  recState === 'idle'
                    ? colors.primary
                    : recState === 'recording'
                      ? colors.error
                      : colors.accent
                }
              />
            </TouchableOpacity>

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
                <Text style={s.pausePillText}>{recState === 'recording' ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={s.stoppedSection}>
            <TextInput
              style={s.titleInput}
              placeholder="Recording title (optional)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              editable={!recordSaving}
            />
            <View style={s.stoppedButtonsRow}>
              <TouchableOpacity style={s.discardButton} onPress={handleDiscard} disabled={recordSaving}>
                <Text style={s.discardButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveButton, recordSaving && s.uploadButtonDisabled]}
                onPress={handleSaveRecording}
                disabled={recordSaving}
              >
                {recordSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.saveButtonText}>Save Recording</Text>
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
          <Text style={s.pickerIcon}>🎵</Text>
          <Text style={s.pickerLabel}>{file ? 'Change file' : 'Choose audio file'}</Text>
          <Text style={s.pickerHint}>MP3, M4A, WAV, OGG · max 25 MB</Text>
        </TouchableOpacity>

        {file && (
          <View style={s.fileInfo}>
            <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
            <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
          </View>
        )}

        {progress !== null && (
          <View style={s.progressContainer}>
            <View style={[s.progressBar, { width: `${progress}%` }]} />
            <Text style={s.progressText}>{progress}%</Text>
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
            <Text style={s.uploadButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>New Recording</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.modeSelector}>
        <TouchableOpacity
          style={[s.modePill, mode === 'summary' && s.modePillActive]}
          onPress={() => setMode('summary')}
        >
          <Text style={[s.modePillText, mode === 'summary' && s.modePillTextActive]}>
            Transcribe + Summarize
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modePill, mode === 'transcript' && s.modePillActive]}
          onPress={() => setMode('transcript')}
        >
          <Text style={[s.modePillText, mode === 'transcript' && s.modePillTextActive]}>
            Transcribe only
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'record' && s.tabActive]} onPress={() => setTab('record')}>
          <Ionicons name="mic" size={16} color={tab === 'record' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, tab === 'record' && s.tabTextActive]}>Record</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'upload' && s.tabActive]} onPress={() => setTab('upload')}>
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={tab === 'upload' ? colors.primary : colors.textMuted}
          />
          <Text style={[s.tabText, tab === 'upload' && s.tabTextActive]}>Upload</Text>
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
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

    modeSelector: {
      flexDirection: 'row', backgroundColor: colors.bgSurface,
      borderRadius: 10, padding: 4, marginHorizontal: 20, marginTop: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    modePill: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    modePillActive: { backgroundColor: colors.primary },
    modePillText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
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
    tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: colors.primary },

    // Upload tab
    uploadBody: { flex: 1, padding: 24 },
    picker: {
      borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
      borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 20,
      backgroundColor: colors.bgSurface,
    },
    pickerIcon: { fontSize: 40, marginBottom: 12 },
    pickerLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
    pickerHint: { fontSize: 12, color: colors.textMuted },
    fileInfo: {
      backgroundColor: colors.bgSurface, borderRadius: 10, padding: 14,
      borderWidth: 1, borderColor: colors.border, marginBottom: 20,
    },
    fileName: { fontSize: 14, color: colors.text, fontWeight: '500', marginBottom: 4 },
    fileSize: { fontSize: 12, color: colors.textMuted },
    progressContainer: {
      height: 6, backgroundColor: colors.bgElevated, borderRadius: 3,
      overflow: 'hidden', marginBottom: 8,
    },
    progressBar: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
    progressText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginBottom: 20 },
    uploadButton: {
      backgroundColor: colors.primary, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center',
    },
    uploadButtonDisabled: { opacity: 0.4 },
    uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    // Record tab
    recordContainer: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
    duration: {
      fontSize: 36, marginTop: 16, fontVariant: ['tabular-nums'],
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    durationActive: { color: colors.text },
    durationIdle: { color: colors.textMuted },
    micButton: {
      width: 80, height: 80, borderRadius: 40, borderWidth: 3,
      alignItems: 'center', justifyContent: 'center', marginTop: 32,
    },
    micButtonIdle: { borderColor: colors.primary, backgroundColor: colors.primary + '1A' },
    micButtonRecording: { borderColor: colors.error, backgroundColor: colors.error + '33' },
    micButtonPaused: { borderColor: colors.accent, backgroundColor: colors.accent + '33' },
    pausePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
    },
    pausePillText: { fontSize: 13, fontWeight: '600', color: colors.text },
    stoppedSection: { width: '100%', marginTop: 32 },
    titleInput: {
      backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
      color: colors.text, fontSize: 15, marginBottom: 16,
    },
    stoppedButtonsRow: { flexDirection: 'row', gap: 12 },
    discardButton: {
      flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    discardButtonText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
    saveButton: {
      flex: 1, backgroundColor: colors.primary, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

    // Permission denied
    permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    permissionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' },
    permissionSubtitle: {
      fontSize: 13, color: colors.textMuted, marginTop: 8,
      textAlign: 'center', lineHeight: 18,
    },
    settingsButton: {
      marginTop: 20, backgroundColor: colors.primary,
      borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12,
    },
    settingsButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  });
}
