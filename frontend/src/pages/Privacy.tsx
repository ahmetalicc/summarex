import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SECTIONS = [
  'intro',
  'dataCollected',
  'howWeUseIt',
  'thirdParties',
  'retention',
  'rights',
] as const;

export default function Privacy() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('privacy.pageTitle')} — Summarex`;
  }, [t]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-10 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm font-medium text-accent backdrop-blur">
        {t('privacy.betaBanner')}
      </div>
      <header className="mb-12 border-b border-border/60 pb-8">
        <p className="eyebrow mb-3">Legal · Privacy</p>
        <h1
          className="font-display font-bold tracking-tight text-text"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1 }}
        >
          {t('privacy.pageTitle')}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-text-muted">{t('privacy.lastUpdated')}</p>
      </header>
      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <div key={s}>
            <h2 className="font-display text-2xl font-bold text-text">
              {t(`privacy.${s}.heading`)}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-muted">{t(`privacy.${s}.body`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
