import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'support@summarex.app';
const INSTAGRAM_URL = 'https://www.instagram.com/summarex.app';

export default function Contact() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('contactPage.pageTitle')} — Summarex`;
  }, [t]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-text">{t('contactPage.pageTitle')}</h1>
      <p className="mt-4 leading-relaxed text-text-muted">{t('contactPage.intro')}</p>
      <div className="mt-10 space-y-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">
            {t('contactPage.emailLabel')}
          </h2>
          <p className="mt-2 leading-relaxed text-text-muted">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-text">
            {t('contactPage.socialLabel')}
          </h2>
          <p className="mt-2 leading-relaxed text-text-muted">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t('contactPage.instagram')}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
