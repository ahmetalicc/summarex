import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { MeetingCard } from '../components/meeting/MeetingCard';
import { useMeetingsList } from '../hooks/useMeetings';
import { MicIcon, RefreshIcon, SearchIcon } from '../components/layout/Icons';

const PAGE_SIZE = 12;

const gridVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput, 300);
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [search]);

  const params = useMemo(
    () => ({ limit, offset: 0, search: search.trim() || undefined }),
    [limit, search],
  );

  const query = useMeetingsList(params);
  const meetings = query.data ?? [];
  const canLoadMore = meetings.length === limit;
  const isFirstLoad = query.isLoading && !query.data;
  const isEmpty = !query.isLoading && meetings.length === 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/record">
          <Button leftIcon={<MicIcon width={16} height={16} />}>
            {t('dashboard.newRecording')}
          </Button>
        </Link>
      </header>

      <div className="mb-6 max-w-md">
        <Input
          placeholder={t('dashboard.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<SearchIcon width={16} height={16} />}
          aria-label={t('dashboard.searchPlaceholder')}
        />
      </div>

      {query.isError && (
        <Card className="mb-6 border-error/40 bg-error/10 p-5 text-sm text-error">
          <p className="font-medium">{t('errors.networkError')}</p>
          <p className="mt-1 text-xs text-error/80">{query.error?.message}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            leftIcon={<RefreshIcon width={14} height={14} />}
            onClick={() => void query.refetch()}
          >
            {t('errors.retry')}
          </Button>
        </Card>
      )}

      {isFirstLoad && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isFirstLoad && isEmpty && !query.isError && (
        <EmptyState
          icon={<MicIcon width={28} height={28} />}
          title={search ? t('dashboard.emptySearchTitle') : t('dashboard.emptyTitle')}
          description={
            search
              ? t('dashboard.emptySearchDescription')
              : t('dashboard.emptyDescription')
          }
          action={
            !search && (
              <Link to="/record">
                <Button leftIcon={<MicIcon width={16} height={16} />}>
                  {t('dashboard.emptyCta')}
                </Button>
              </Link>
            )
          }
        />
      )}

      {meetings.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {meetings.map((m) => (
            <motion.div key={m.id} variants={cardVariants}>
              <MeetingCard meeting={m} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {canLoadMore && !query.isLoading && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            isLoading={query.isFetching}
          >
            {t('dashboard.loadMore')}
          </Button>
        </div>
      )}
    </section>
  );
}
