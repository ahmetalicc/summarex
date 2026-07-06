import { useTranslation } from 'react-i18next';
import { AudioCapture } from '../components/audio/AudioCapture';
import { TranscriptPicker } from '../components/meeting/TranscriptPicker';

export default function SummarizePage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-12 border-b border-border/60 pb-8">
        <p className="eyebrow mb-3">Summarize · Voice → Insights</p>
        <h1
          className="font-display font-bold tracking-tight text-text"
          style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', lineHeight: 1 }}
        >
          {t('summarize.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-text-muted">
          {t('summarize.subtitle')}
        </p>
      </header>

      <AudioCapture mode="summary" />

      <div className="mt-16 border-t border-border/60 pt-10">
        <div className="mb-6">
          <p className="eyebrow mb-2">Existing transcripts</p>
          <h2 className="font-display text-2xl font-bold text-text">
            {t('summarize.pickerTitle')}
          </h2>
          <p className="mt-2 text-[15px] text-text-muted">{t('summarize.pickerSubtitle')}</p>
        </div>
        <TranscriptPicker />
      </div>
    </section>
  );
}
