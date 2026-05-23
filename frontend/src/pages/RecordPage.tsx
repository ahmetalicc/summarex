import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { AudioRecorder } from '../components/audio/AudioRecorder';
import { UploadZone } from '../components/audio/UploadZone';
import { MicIcon, UploadIcon } from '../components/layout/Icons';

export default function RecordPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
          {t('recording.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
          {t('recording.subtitle')}
        </p>
      </header>

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
          <AudioRecorder />
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
          <UploadZone />
        </Card>
      </div>
    </section>
  );
}
