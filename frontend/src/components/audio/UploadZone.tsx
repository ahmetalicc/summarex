import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { FilePlusIcon, UploadIcon } from '../layout/Icons';
import { useUploadAudio } from '../../hooks/useAudioUpload';
import type { ProcessingMode } from '../../types/meeting';

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'webm'] as const;
const ACCEPT_ATTR = '.mp3,.wav,.m4a,.webm,audio/*';
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function probeDurationSeconds(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const d = audio.duration;
        resolve(Number.isFinite(d) && d > 0 ? d : undefined);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      audio.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

export function UploadZone({ mode = 'summary' }: { mode?: ProcessingMode }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadAudio();

  const validate = useCallback(
    (candidate: File): string | null => {
      const ext = getExtension(candidate.name);
      if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
        return t('recording.invalidFile');
      }
      if (candidate.size <= 0) {
        return t('recording.fileEmpty');
      }
      if (candidate.size > MAX_SIZE_BYTES) {
        return t('recording.fileTooLarge');
      }
      return null;
    },
    [t],
  );

  const handleFile = useCallback(
    (candidate: File | null) => {
      if (!candidate) return;
      const err = validate(candidate);
      if (err) {
        setError(err);
        setFile(null);
        return;
      }
      setError(null);
      setFile(candidate);
    },
    [validate],
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFile(f);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    handleFile(f);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDiscard = () => {
    setFile(null);
    setTitle('');
    setError(null);
    uploadMutation.reset();
  };

  const handleUpload = async () => {
    if (!file) return;
    const durationSeconds = await probeDurationSeconds(file);
    uploadMutation.mutate({ file, title: title.trim() || undefined, mode, durationSeconds });
  };

  return (
    <div className="flex flex-col gap-4 p-6 sm:p-8">
      {!file && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-bg-elevated/30 text-text-muted hover:border-primary/60 hover:bg-bg-elevated/60',
          )}
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadIcon width={26} height={26} />
          </div>
          <p className="text-base font-medium text-text">{t('recording.dragHere')}</p>
          <p className="text-xs text-text-muted">
            {t('recording.acceptHint', {
              extensions: ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', '),
              maxMb: 100,
            })}
          </p>
          <Button variant="secondary" size="sm" type="button" className="mt-2">
            {t('recording.browseFiles')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {file && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated/40 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FilePlusIcon width={20} height={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-text">{file.name}</p>
              <p className="text-xs text-text-muted">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={handleDiscard}
              className="text-xs font-medium text-text-muted transition-colors hover:text-text"
            >
              {t('recording.discardButton')}
            </button>
          </div>

          <Input
            label={t('recording.titleLabel')}
            placeholder={t('recording.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />

          {uploadMutation.isError && (
            <p className="text-sm text-error">
              {uploadMutation.error?.message ?? t('errors.networkError')}
            </p>
          )}

          <Button
            onClick={() => void handleUpload()}
            isLoading={uploadMutation.isPending}
            leftIcon={!uploadMutation.isPending && <UploadIcon width={16} height={16} />}
          >
            {uploadMutation.isPending
              ? t('recording.uploading')
              : t('recording.uploadButton')}
          </Button>

          {uploadMutation.isPending && (
            <div className="inline-flex items-center gap-2 text-xs text-text-muted">
              <Spinner size="sm" />
              {t('recording.uploading')}
            </div>
          )}
        </div>
      )}

      {error && !file && (
        <p className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
