import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'ahmetskry54@gmail.com';

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
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-8 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
        {t('privacy.betaBanner')}
      </div>
      <h1 className="font-display text-3xl font-bold text-text">{t('privacy.pageTitle')}</h1>
      <p className="mt-2 text-sm text-text-muted">{t('privacy.lastUpdated')}</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <div key={s}>
            <h2 className="font-display text-xl font-semibold text-text">
              {t(`privacy.${s}.heading`)}
            </h2>
            <p className="mt-2 leading-relaxed text-text-muted">{t(`privacy.${s}.body`)}</p>
          </div>
        ))}
        <div>
          <h2 className="font-display text-xl font-semibold text-text">
            {t('privacy.contact.heading')}
          </h2>
          <p className="mt-2 leading-relaxed text-text-muted">
            {t('privacy.contact.body')}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
