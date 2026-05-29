import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { AlertTriangleIcon } from '../components/layout/Icons';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem-4rem)] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-bg-surface text-text-muted">
        <AlertTriangleIcon width={22} height={22} />
      </div>
      <h1 className="font-display text-5xl font-bold text-text">
        {t('notFound.title')}
      </h1>
      <p className="text-sm text-text-muted">{t('notFound.body')}</p>
      <Link to="/">
        <Button>{t('notFound.action')}</Button>
      </Link>
    </section>
  );
}
