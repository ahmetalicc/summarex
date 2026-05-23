import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecordingStore } from '../store/recordingStore';

interface UseRecorderResult {
  analyser: AnalyserNode | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useRecorder(): UseRecorderResult {
  const setState = useRecordingStore((s) => s.setState);
  const setDurationMs = useRecordingStore((s) => s.setDurationMs);
  const setBlob = useRecordingStore((s) => s.setBlob);
  const setError = useRecordingStore((s) => s.setError);
  const resetStore = useRecordingStore((s) => s.reset);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const mimeRef = useRef<string | undefined>(undefined);

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const stopTicker = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    stopTicker();
    startedAtRef.current = performance.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current;
      setDurationMs(accumulatedRef.current + elapsed);
    }, 100);
  }, [setDurationMs, stopTicker]);

  const teardownAudio = useCallback(() => {
    stopTicker();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    setAnalyser(null);
    recorderRef.current = null;
  }, [stopTicker]);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);
    accumulatedRef.current = 0;
    chunksRef.current = [];
    setDurationMs(0);
    setBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.8;
      source.connect(node);
      setAnalyser(node);

      const mimeType = pickMimeType();
      mimeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = mimeRef.current ?? recorder.mimeType ?? 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setBlob(blob);
        setState('stopped');
        teardownAudio();
      };

      recorder.start(250);
      startTicker();
      setState('recording');
    } catch (err) {
      teardownAudio();
      const isPermission =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setError(isPermission ? 'recording.permissionDenied' : 'recording.startFailed');
    }
  }, [setBlob, setDurationMs, setError, setState, startTicker, teardownAudio]);

  const pause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    rec.pause();
    accumulatedRef.current += performance.now() - startedAtRef.current;
    stopTicker();
    setState('paused');
  }, [setState, stopTicker]);

  const resume = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'paused') return;
    rec.resume();
    startTicker();
    setState('recording');
  }, [setState, startTicker]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      accumulatedRef.current += performance.now() - startedAtRef.current;
    }
    stopTicker();
    rec.stop();
  }, [stopTicker]);

  const reset = useCallback(() => {
    teardownAudio();
    chunksRef.current = [];
    accumulatedRef.current = 0;
    resetStore();
  }, [resetStore, teardownAudio]);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.state === 'recording' && recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      teardownAudio();
    };
  }, [teardownAudio]);

  return { analyser, start, pause, resume, stop, reset };
}
