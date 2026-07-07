import { useTranslation } from 'react-i18next';
import { AudioCapture } from '../components/audio/AudioCapture';

export default function TranscribePage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-12 border-b border-border/60 pb-8">
        <p className="eyebrow mb-3">Transcribe · Voice → Text</p>
        <h1
          className="font-display font-bold tracking-tight text-text"
          style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', lineHeight: 1 }}
        >
          {t('transcribe.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-text-muted">
          {t('transcribe.subtitle')}
        </p>
      </header>
      <AudioCapture mode="transcript" />
    </section>
  );
}
