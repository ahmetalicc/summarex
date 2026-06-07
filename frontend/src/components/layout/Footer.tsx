import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brand } from './Brand';
import { GitHubIcon } from './Icons';

const GITHUB_URL = 'https://github.com/ahmetalicc/summarex.git';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border/50 bg-bg-surface/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-text-muted sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <Brand />
          <span className="text-xs">© {year} · {t('footer.rights')}</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/privacy" className="text-xs transition-colors hover:text-text">
            {t('footer.privacy')}
          </Link>
          <Link to="/terms" className="text-xs transition-colors hover:text-text">
            {t('footer.terms')}
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-text"
            aria-label={t('footer.github')}
          >
            <GitHubIcon width={18} height={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
