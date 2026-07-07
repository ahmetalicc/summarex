import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { AudioRecorder } from './AudioRecorder';
import { UploadZone } from './UploadZone';
import { MicIcon, UploadIcon } from '../layout/Icons';
import type { ProcessingMode } from '../../types/meeting';

export function AudioCapture({ mode }: { mode: ProcessingMode }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card gradient className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border/70 px-7 py-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MicIcon width={20} height={20} />
          </span>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              01 · Record
            </p>
            <h2 className="mt-0.5 font-display text-base font-semibold text-text">
              {t('recording.recordTab')}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">{t('recording.recordHint')}</p>
          </div>
        </div>
        <AudioRecorder mode={mode} />
      </Card>

      <Card gradient className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border/70 px-7 py-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/20 text-accent">
            <UploadIcon width={20} height={20} />
          </span>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              02 · Upload
            </p>
            <h2 className="mt-0.5 font-display text-base font-semibold text-text">
              {t('recording.uploadTab')}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">{t('recording.uploadHint')}</p>
          </div>
        </div>
        <UploadZone mode={mode} />
      </Card>
    </div>
  );
}
