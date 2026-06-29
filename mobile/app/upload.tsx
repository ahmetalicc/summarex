import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { uploadMeeting } from '@/lib/api';
import { Colors } from '@/constants/colors';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/aac'];
const MAX_BYTES = 25 * 1024 * 1024;

export default function UploadScreen() {
  const router = useRouter();
  const [file, setFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

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

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      await uploadMeeting(file.uri, file.name, file.mimeType, setProgress);
      router.back();
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      if (err.status === 429) {
        Alert.alert('Monthly limit reached', err.message);
      } else {
        Alert.alert('Upload failed', err.message);
      }
    } finally {
      setUploading(false);
    }
  }

  function formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={uploading}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Upload Audio</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.body}>
        <TouchableOpacity style={s.picker} onPress={pickFile} disabled={uploading}>
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
          style={[s.uploadButton, (!file || uploading) && s.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.uploadButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  cancel: { color: Colors.dark.primary, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '600', color: Colors.dark.text },
  body: { flex: 1, padding: 24 },
  picker: {
    borderWidth: 2, borderColor: Colors.dark.border, borderStyle: 'dashed',
    borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 20,
    backgroundColor: Colors.dark.bgSurface,
  },
  pickerIcon: { fontSize: 40, marginBottom: 12 },
  pickerLabel: { fontSize: 16, fontWeight: '600', color: Colors.dark.text, marginBottom: 6 },
  pickerHint: { fontSize: 12, color: Colors.dark.textMuted },
  fileInfo: {
    backgroundColor: Colors.dark.bgSurface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.border, marginBottom: 20,
  },
  fileName: { fontSize: 14, color: Colors.dark.text, fontWeight: '500', marginBottom: 4 },
  fileSize: { fontSize: 12, color: Colors.dark.textMuted },
  progressContainer: {
    height: 6, backgroundColor: Colors.dark.bgElevated, borderRadius: 3,
    overflow: 'hidden', marginBottom: 8,
  },
  progressBar: { height: 6, backgroundColor: Colors.dark.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: Colors.dark.textMuted, textAlign: 'right', marginBottom: 20 },
  uploadButton: {
    backgroundColor: Colors.dark.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  uploadButtonDisabled: { opacity: 0.4 },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
