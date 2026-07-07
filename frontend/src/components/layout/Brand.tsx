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
        'group inline-flex items-center gap-2.5 text-text transition-opacity hover:opacity-90',
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
        className="h-8 w-8 rounded-xl ring-1 ring-primary/20 shadow-[0_2px_16px_-6px_rgb(var(--color-primary)/0.5)]"
      />
      <span className="font-display text-xl font-bold tracking-tight">
        Summa<span className="text-primary">rex</span>
      </span>
    </Link>
  );
}
