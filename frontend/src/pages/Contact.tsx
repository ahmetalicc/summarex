import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MailIcon, InstagramIcon } from '../components/layout/Icons';

const CONTACT_EMAIL = 'support@summarex.app';
const INSTAGRAM_URL = 'https://www.instagram.com/summarex.app';

export default function Contact() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('contactPage.pageTitle')} — Summarex`;
  }, [t]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <header className="mb-14 border-b border-border/60 pb-8">
        <p className="eyebrow mb-3">{t('contactPage.eyebrow')}</p>
        <h1
          className="font-display font-bold tracking-tight text-text"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1 }}
        >
          {t('contactPage.pageTitle')}
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-text-muted">
          {t('contactPage.intro')}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group relative overflow-hidden rounded-3xl border border-border bg-bg-surface/60 p-8 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 gradient-border"
        >
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <MailIcon />
          </div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
            {t('contactPage.emailLabel')}
          </p>
          <p className="mt-3 font-display text-2xl font-semibold text-text transition-colors group-hover:text-primary">
            {CONTACT_EMAIL}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors group-hover:text-primary">
            {t('contactPage.sendMessage')}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </a>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-3xl border border-border bg-bg-surface/60 p-8 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/50 gradient-border"
        >
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-accent/20 text-accent">
            <InstagramIcon />
          </div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
            {t('contactPage.socialLabel')}
          </p>
          <p className="mt-3 font-display text-2xl font-semibold text-text transition-colors group-hover:text-accent">
            {t('contactPage.instagram')}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors group-hover:text-accent">
            {t('contactPage.followUs')}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </div>
        </a>
      </div>
    </section>
  );
}
