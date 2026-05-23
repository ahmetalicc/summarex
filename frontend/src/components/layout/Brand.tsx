import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface BrandProps {
  className?: string;
  to?: string;
}

export function Brand({ className, to = '/' }: BrandProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-2 text-text transition-colors',
        className,
      )}
      aria-label={t('common.brand')}
    >
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent text-bg shadow-[0_4px_24px_-4px_rgba(0,212,170,0.6)]">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 12h2M9 7v10M14 4v16M19 9v6M22 12h-2" />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        {t('common.brand')}
      </span>
    </Link>
  );
}
