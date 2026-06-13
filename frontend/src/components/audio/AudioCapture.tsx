import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { AudioRecorder } from './AudioRecorder';
import { UploadZone } from './UploadZone';
import { MicIcon, UploadIcon } from '../layout/Icons';
import type { ProcessingMode } from '../../types/meeting';

export function AudioCapture({ mode }: { mode: ProcessingMode }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card glass className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <MicIcon width={18} height={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text">{t('recording.recordTab')}</h2>
            <p className="text-xs text-text-muted">{t('recording.recordHint')}</p>
          </div>
        </div>
        <AudioRecorder mode={mode} />
      </Card>

      <Card glass className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <UploadIcon width={18} height={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text">{t('recording.uploadTab')}</h2>
            <p className="text-xs text-text-muted">{t('recording.uploadHint')}</p>
          </div>
        </div>
        <UploadZone mode={mode} />
      </Card>
    </div>
  );
}
