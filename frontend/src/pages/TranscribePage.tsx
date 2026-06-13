import { useTranslation } from 'react-i18next';
import { AudioCapture } from '../components/audio/AudioCapture';

export default function TranscribePage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
          {t('transcribe.title')}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-muted">
          {t('transcribe.subtitle')}
        </p>
      </header>
      <AudioCapture mode="transcript" />
    </section>
  );
}
