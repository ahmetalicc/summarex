import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SECTIONS = [
  'intro',
  'account',
  'acceptableUse',
  'aiAccuracy',
  'availability',
  'termination',
  'liability',
  'governingLaw',
] as const;

export default function Terms() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('terms.pageTitle')} — Summarex`;
  }, [t]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-8 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
        {t('terms.betaBanner')}
      </div>
      <h1 className="font-display text-3xl font-bold text-text">{t('terms.pageTitle')}</h1>
      <p className="mt-2 text-sm text-text-muted">{t('terms.lastUpdated')}</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <div key={s}>
            <h2 className="font-display text-xl font-semibold text-text">
              {t(`terms.${s}.heading`)}
            </h2>
            <p className="mt-2 leading-relaxed text-text-muted">{t(`terms.${s}.body`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
