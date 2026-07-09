import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from './Brand';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border/60 bg-bg-surface/40 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-3">
            <Brand />
            <p className="max-w-xs font-mono text-[11px] uppercase tracking-widest text-text-muted">
              {t('auth.brandEyebrow')}
            </p>
          </div>

          <div className="flex flex-col items-start gap-6 md:items-end">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <Link to="/privacy" className="text-text-muted transition-colors hover:text-primary">
                {t('footer.privacy')}
              </Link>
              <Link to="/terms" className="text-text-muted transition-colors hover:text-primary">
                {t('footer.terms')}
              </Link>
              <Link to="/contact" className="text-text-muted transition-colors hover:text-primary">
                {t('footer.contact')}
              </Link>
            </div>
            <div className="font-mono text-xs text-text-muted">
              © {year} · {t('footer.rights')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
