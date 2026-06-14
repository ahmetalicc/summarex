import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRecorder } from '../../hooks/useRecorder';
import { useRecordAudio } from '../../hooks/useAudioUpload';
import { useRecordingStore } from '../../store/recordingStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { LiveWaveform } from './LiveWaveform';
import {
  MicIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  StopIcon,
} from '../layout/Icons';
import { cn } from '../../lib/utils';
import type { ProcessingMode } from '../../types/meeting';

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const PERMISSION_HELP_URL =
  'https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security';

export function AudioRecorder({ mode = 'summary' }: { mode?: ProcessingMode }) {
  const { t } = useTranslation();
  const { analyser, start, pause, resume, stop, reset } = useRecorder();
  const state = useRecordingStore((s) => s.state);
  const durationMs = useRecordingStore((s) => s.durationMs);
  const blob = useRecordingStore((s) => s.blob);
  const errorMessage = useRecordingStore((s) => s.errorMessage);
  const recordMutation = useRecordAudio();
  const [title, setTitle] = useState('');

  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isStopped = state === 'stopped';
  const isError = state === 'error';

  const mainAction = async () => {
    if (state === 'idle' || state === 'error') {
      await start();
      return;
    }
    if (state === 'recording') {
      stop();
      return;
    }
    if (state === 'paused') {
      stop();
    }
  };

  const handleDiscard = () => {
    reset();
    setTitle('');
    recordMutation.reset();
  };

  const handleSave = () => {
    if (!blob) return;
    recordMutation.mutate({
      blob,
      title: title.trim() || undefined,
      mode,
      durationSeconds: durationMs > 0 ? durationMs / 1000 : undefined,
    });
  };

  const ringColor = isError
    ? 'ring-error/60 bg-error/15 text-error'
    : isRecording
      ? 'ring-error/40 bg-error/20 text-error'
      : isPaused
        ? 'ring-accent/40 bg-accent/20 text-accent'
        : 'ring-primary/40 bg-primary/15 text-primary';

  const mainIcon = isRecording ? (
    <StopIcon width={28} height={28} />
  ) : isPaused ? (
    <StopIcon width={28} height={28} />
  ) : (
    <MicIcon width={28} height={28} />
  );

  const mainLabel = isRecording
    ? t('recording.stopButton')
    : isPaused
      ? t('recording.stopButton')
      : isError
        ? t('recording.tryAgain')
        : t('recording.startButton');

  return (
    <div className="flex flex-col items-center gap-6 p-6 sm:p-8">
      <div className="relative">
        {isRecording && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-error/30"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <button
          type="button"
          onClick={mainAction}
          disabled={isStopped || recordMutation.isPending}
          aria-label={mainLabel}
          className={cn(
            'relative grid h-24 w-24 place-items-center rounded-full ring-4 transition-colors',
            ringColor,
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {mainIcon}
        </button>
      </div>

      {/* Pause / resume secondary control */}
      {(isRecording || isPaused) && (
        <button
          type="button"
          onClick={isRecording ? pause : resume}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          {isRecording ? (
            <>
              <PauseIcon width={12} height={12} />
              {t('recording.pauseButton')}
            </>
          ) : (
            <>
              <PlayIcon width={12} height={12} />
              {t('recording.resumeButton')}
            </>
          )}
        </button>
      )}

      <div
        aria-label={t('recording.timerLabel')}
        className={cn(
          'font-mono text-3xl tabular-nums tracking-wider',
          isRecording ? 'text-text' : 'text-text-muted',
        )}
      >
        {formatDuration(durationMs)}
      </div>

      <LiveWaveform
        analyser={analyser}
        isActive={isRecording}
        className="rounded-lg border border-border/60 bg-bg-elevated/40"
      />

      {isError && (
        <div className="w-full rounded-xl border border-error/40 bg-error/10 p-4 text-sm text-error">
          <p className="font-medium">
            {errorMessage ? t(errorMessage) : t('recording.startFailed')}
          </p>
          {errorMessage === 'recording.permissionDenied' && (
            <p className="mt-1 text-xs text-error/80">
              {t('recording.permissionDeniedHelp')}{' '}
              <a
                href={PERMISSION_HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {t('recording.learnHow')}
              </a>
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            leftIcon={<RefreshIcon width={14} height={14} />}
            onClick={handleDiscard}
          >
            {t('recording.tryAgain')}
          </Button>
        </div>
      )}

      {isStopped && (
        <div className="flex w-full flex-col gap-4">
          <Input
            label={t('recording.titleLabel')}
            placeholder={t('recording.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          {recordMutation.isError && (
            <p className="text-sm text-error">
              {recordMutation.error?.message ?? t('errors.networkError')}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleDiscard}
              disabled={recordMutation.isPending}
            >
              {t('recording.discardButton')}
            </Button>
            <Button
              onClick={handleSave}
              isLoading={recordMutation.isPending}
              leftIcon={!recordMutation.isPending && <MicIcon width={16} height={16} />}
            >
              {recordMutation.isPending
                ? t('recording.uploading')
                : t('recording.saveButton')}
            </Button>
          </div>
        </div>
      )}

      {state === 'idle' && !isError && (
        <p className="text-center text-xs text-text-muted">
          {t('recording.recordHint')}
        </p>
      )}

      {recordMutation.isPending && isStopped && (
        <div className="inline-flex items-center gap-2 text-xs text-text-muted">
          <Spinner size="sm" />
          {t('recording.uploading')}
        </div>
      )}
    </div>
  );
}
