import { createAudioPlayer, AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

// ── Server constraints (backend/app/services/audio_service.py) ────────────────

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_MB = 25;
export const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg', 'oga', 'opus'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// ── Speech recording preset ───────────────────────────────────────────────────
// AAC-LC in m4a, mono, 22.05 kHz, 48 kbps CBR:
//   48 000 bit/s ÷ 8 = 6 000 B/s = 360 000 B/min ≈ 0.343 MiB/min
//   25 MiB ÷ 0.343 MiB/min ≈ 72.8 min (vs ~27 min with HIGH_QUALITY, 128 kbps stereo)
// Sample rate and channel count are top-level only so prepareToRecordAsync can
// override them on both platforms.

export const SPEECH_RECORDING_BITRATE = 48_000;
export const SPEECH_RECORDING_BYTES_PER_SEC = SPEECH_RECORDING_BITRATE / 8;

export const SPEECH_RECORDING_PRESET: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: SPEECH_RECORDING_BITRATE,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: SPEECH_RECORDING_BITRATE },
};

// Auto-stop at 24 MiB estimated (96 % of the cap) so container overhead and
// bitrate drift can't push the final file over 25 MiB. Warn at 90 % of the cap.
export const RECORDING_STOP_BYTES = 24 * 1024 * 1024;
export const RECORDING_WARN_BYTES = Math.floor(MAX_UPLOAD_BYTES * 0.9);

export function estimateRecordingBytes(durationMillis: number): number {
  return Math.round((durationMillis / 1000) * SPEECH_RECORDING_BYTES_PER_SEC);
}

export function remainingRecordingSeconds(durationMillis: number): number {
  const left = (RECORDING_STOP_BYTES - estimateRecordingBytes(durationMillis)) / SPEECH_RECORDING_BYTES_PER_SEC;
  return Math.max(0, Math.floor(left));
}

// ── Extension / MIME handling (mirrors frontend UploadZone.tsx) ───────────────

const MIME_EXTENSION_MAP: Record<string, AllowedExtension> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'video/mp4': 'mp4',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
};

const EXTENSION_MIME_MAP: Record<AllowedExtension, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/opus',
};

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function isAllowed(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

// Android pickers sometimes return a name without a usable extension but a
// correct MIME type, so fall back to sniffing that. Returns null when the file
// is not in the server's allow-list (e.g. aac, 3gp, amr).
export function resolveAudioExtension(name: string, mimeType: string | undefined): AllowedExtension | null {
  const ext = getExtension(name);
  if (isAllowed(ext)) return ext;
  const normalized = (mimeType ?? '').split(';')[0].trim().toLowerCase();
  return MIME_EXTENSION_MAP[normalized] ?? null;
}

// The backend infers the format from the uploaded filename, and the native
// uploader takes that filename from the URI's last path segment. If the file's
// current extension is not the resolved one, copy it to a correctly named file.
export async function ensureUploadableFile(
  uri: string,
  name: string,
  ext: AllowedExtension
): Promise<{ uri: string; mimeType: string }> {
  const mimeType = EXTENSION_MIME_MAP[ext];
  if (getExtension(uri.split('?')[0]) === ext) return { uri, mimeType };

  const currentExt = getExtension(name);
  const base = (currentExt ? name.slice(0, name.length - currentExt.length - 1) : name) || 'audio';
  const safeBase = base.replace(/[^\w.-]+/g, '_');
  const dest = new File(Paths.cache, `${Date.now()}-${safeBase}.${ext}`);
  await new File(uri).copy(dest);
  return { uri: dest.uri, mimeType };
}

export function getFileSize(uri: string): number | null {
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
}

// ── Duration probe (for the server's quota pre-check) ─────────────────────────

const PROBE_TIMEOUT_MS = 5000;
const PROBE_POLL_MS = 100;

export function probeDurationSeconds(uri: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (value: number | undefined) => {
      if (timer) clearInterval(timer);
      if (timeout) clearTimeout(timeout);
      try { player?.remove(); } catch {}
      resolve(value);
    };

    try {
      player = createAudioPlayer(uri);
      timer = setInterval(() => {
        const d = player?.duration;
        if (player?.isLoaded && typeof d === 'number' && Number.isFinite(d) && d > 0) finish(d);
      }, PROBE_POLL_MS);
      timeout = setTimeout(() => finish(undefined), PROBE_TIMEOUT_MS);
    } catch {
      finish(undefined);
    }
  });
}
