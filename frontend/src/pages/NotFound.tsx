import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { AlertTriangleIcon } from '../components/layout/Icons';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem-4rem)] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-bg-surface/60 text-accent backdrop-blur">
        <AlertTriangleIcon width={24} height={24} />
      </div>
      <p className="eyebrow">404 · Not found</p>
      <h1
        className="font-display font-bold tracking-tight text-text"
        style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 0.9 }}
      >
        {t('notFound.title')}
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-text-muted">{t('notFound.body')}</p>
      <Link to="/">
        <Button size="lg">{t('notFound.action')}</Button>
      </Link>
    </section>
  );
}
