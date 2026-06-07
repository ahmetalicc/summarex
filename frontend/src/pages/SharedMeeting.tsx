import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { usePublicSharedMeeting } from '../hooks/useSharedMeeting';
import { TranscriptView } from '../components/meeting/TranscriptView';
import { SummaryPanel } from '../components/meeting/SummaryPanel';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { AlertTriangleIcon } from '../components/layout/Icons';
import { formatSeconds } from '../lib/format';
import { displayTitle } from '../lib/meetingTitle';
import type { ApiError } from '../lib/apiClient';

export default function SharedMeeting() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const query = usePublicSharedMeeting(token);

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isMissing =
    query.isError && (query.error as ApiError | undefined)?.status === 404;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {query.isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-48" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[60vh] rounded-2xl" />
            <Skeleton className="h-[60vh] rounded-2xl" />
          </div>
        </div>
      )}

      {isMissing && (
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-bg-surface/60 p-8 text-center backdrop-blur">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-error/15 text-error">
            <AlertTriangleIcon width={20} height={20} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-text">
            {t('shared.expiredOrInvalidTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{t('shared.expiredOrInvalid')}</p>
          <Link
            to="/"
            className="mt-6 inline-flex text-sm font-medium text-primary hover:text-primary-hover"
          >
            {t('shared.footerCta')}
          </Link>
        </div>
      )}

      {query.isError && !isMissing && (
        <div className="rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
          <h2 className="text-lg font-semibold">{t('meeting.errorTitle')}</h2>
          <p className="mt-2 text-sm text-error/80">
            {query.error?.message ?? t('errors.networkError')}
          </p>
        </div>
      )}

      {query.data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <header className="mb-6 flex flex-col gap-3">
            <Badge variant="info" dot={false}>
              {t('shared.title')}
            </Badge>
            <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
              {displayTitle(query.data.title, t)}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
              {query.data.created_at && (
                <span>{dateFmt.format(new Date(query.data.created_at))}</span>
              )}
              {typeof query.data.duration_seconds === 'number' && (
                <span className="font-mono tabular-nums">
                  {formatSeconds(query.data.duration_seconds)}
                </span>
              )}
              {query.data.language && (
                <Badge variant="neutral" dot={false} className="uppercase">
                  {query.data.language}
                </Badge>
              )}
            </div>
          </header>

          <div className="grid h-[calc(100dvh-18rem)] min-h-[480px] gap-4 md:grid-cols-2">
            <div className="min-h-0">
              {query.data.transcript ? (
                <TranscriptView transcript={query.data.transcript} />
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-border bg-bg-surface/60 p-6 text-sm text-text-muted">
                  {t('meeting.transcriptEmpty')}
                </div>
              )}
            </div>
            <div className="min-h-0">
              {query.data.summary ? (
                <SummaryPanel summary={query.data.summary} />
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-border bg-bg-surface/60 p-6 text-sm text-text-muted">
                  {t('meeting.summary.empty')}
                </div>
              )}
            </div>
          </div>

          <footer className="mt-10 flex flex-col items-center gap-1 border-t border-border/50 pt-6 text-center text-sm text-text-muted">
            <span>{t('shared.footerLine')}</span>
            <Link
              to="/"
              className="font-medium text-primary hover:text-primary-hover"
            >
              {t('shared.footerCta')}
            </Link>
          </footer>
        </motion.div>
      )}
    </section>
  );
}
