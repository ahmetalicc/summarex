import { useTranslation } from 'react-i18next';
import { AudioCapture } from '../components/audio/AudioCapture';
import { TranscriptPicker } from '../components/meeting/TranscriptPicker';

export default function SummarizePage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
          {t('summarize.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
          {t('summarize.subtitle')}
        </p>
      </header>

      <AudioCapture mode="summary" />

      <div className="mt-14">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-text">
            {t('summarize.pickerTitle')}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{t('summarize.pickerSubtitle')}</p>
        </div>
        <TranscriptPicker />
      </div>
    </section>
  );
}
