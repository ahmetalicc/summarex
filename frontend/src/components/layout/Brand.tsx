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
      <img
        src="/brand-mark.png"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="h-8 w-8 rounded-xl shadow-[0_2px_12px_-6px_rgba(42,180,143,0.22)]"
      />
      <span className="font-display text-lg font-semibold tracking-tight">
        Summa<span className="text-primary">rex</span>
      </span>
    </Link>
  );
}
