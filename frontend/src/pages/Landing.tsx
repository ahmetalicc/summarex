import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold text-text">{t('common.brandName')}</h1>
      <p className="text-text-muted">{t('common.tagline')}</p>
      <Link to="/login" className="text-primary hover:text-primary-hover">
        {t('common.getStarted')}
      </Link>
    </main>
  );
}
