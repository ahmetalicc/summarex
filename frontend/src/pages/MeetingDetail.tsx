import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  useMeeting,
  useMeetingStatus,
  useSummary,
  useTranscript,
} from '../hooks/useMeeting';
import {
  useDeleteMeetingById,
  useRegenerateSummary,
  useUpdateMeeting,
} from '../hooks/useMeetingMutations';
import { Button } from '../components/ui/Button';
import { Badge, statusToBadgeVariant } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import { TranscriptView } from '../components/meeting/TranscriptView';
import { SummaryPanel } from '../components/meeting/SummaryPanel';
import { ShareModal } from '../components/meeting/ShareModal';
import { ProcessingPanel } from '../components/meeting/ProcessingPanel';
import { EditableTitle } from '../components/meeting/EditableTitle';
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  RefreshIcon,
  ShareIcon,
  TrashIcon,
} from '../components/layout/Icons';
import type { MeetingStatus } from '../types/meeting';
import { displayTitle } from '../lib/meetingTitle';

function statusKey(status: MeetingStatus): string {
  switch (status) {
    case 'queued':
      return 'meeting.statusQueued';
    case 'transcribing':
      return 'meeting.statusTranscribing';
    case 'transcribed':
      return 'meeting.statusTranscribed';
    case 'summarizing':
      return 'meeting.statusSummarizing';
    case 'done':
      return 'meeting.statusDone';
    case 'error':
      return 'meeting.statusError';
  }
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const meetingQuery = useMeeting(id);
  const meeting = meetingQuery.data;
  const statusQuery = useMeetingStatus(id, meeting?.status);
  const liveStatus: MeetingStatus | undefined =
    statusQuery.data?.status ?? meeting?.status;

  const transcriptQuery = useTranscript(id, liveStatus);
  const summaryQuery = useSummary(id, liveStatus);

  const updateMutation = useUpdateMeeting(id ?? '');
  const deleteMutation = useDeleteMeetingById();
  const regenerateMutation = useRegenerateSummary(id ?? '');

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const errorMessage = statusQuery.data?.error_message ?? meeting?.error_message ?? null;

  const onSubmitTitle = async (next: string) => {
    await updateMutation.mutateAsync({ title: next });
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleRegenerate = async () => {
    await regenerateMutation.mutateAsync();
    setRegenerateOpen(false);
  };

  const isLoading = meetingQuery.isLoading;
  const isError = meetingQuery.isError;

  const title = useMemo(
    () => displayTitle(meeting?.title, t),
    [meeting?.title, t],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeftIcon width={16} height={16} />
        {t('meeting.detailBack')}
      </Link>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-6 w-40" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[60vh] rounded-2xl" />
            <Skeleton className="h-[60vh] rounded-2xl" />
          </div>
        </div>
      )}

      {isError && !meeting && (
        <div className="rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
          <h2 className="text-lg font-semibold">{t('meeting.errorTitle')}</h2>
          <p className="mt-2 text-sm text-error/80">
            {meetingQuery.error?.message ?? t('errors.networkError')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            leftIcon={<RefreshIcon width={14} height={14} />}
            onClick={() => void meetingQuery.refetch()}
          >
            {t('errors.retry')}
          </Button>
        </div>
      )}

      {meeting && liveStatus && (
        <>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <EditableTitle
                  value={meeting.title}
                  onSubmit={onSubmitTitle}
                  disabled={updateMutation.isPending}
                />
                {updateMutation.isPending && (
                  <Spinner size="sm" className="text-text-muted" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <Badge variant={statusToBadgeVariant(liveStatus)}>
                  {t(statusKey(liveStatus))}
                </Badge>
                {meeting.created_at && (
                  <span>
                    {new Date(meeting.created_at).toLocaleString()}
                  </span>
                )}
                {regenerateMutation.isPending && (
                  <span className="inline-flex items-center gap-1.5 text-accent">
                    <Spinner size="sm" className="text-accent" />
                    {t('meeting.regenerating')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareOpen(true)}
                leftIcon={<ShareIcon width={14} height={14} />}
              >
                {t('meeting.share')}
              </Button>
              {liveStatus === 'done' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRegenerateOpen(true)}
                  leftIcon={<RefreshIcon width={14} height={14} />}
                  disabled={regenerateMutation.isPending}
                >
                  {t('meeting.regenerate')}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                leftIcon={<TrashIcon width={14} height={14} />}
              >
                {t('meeting.delete')}
              </Button>
            </div>
          </header>

          <motion.div
            key={liveStatus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-8"
          >
            {liveStatus === 'error' && (
              <div className="rounded-2xl border border-error/40 bg-error/10 p-6 text-error">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon width={20} height={20} />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{t('meeting.errorTitle')}</h2>
                    <p className="mt-1 text-sm text-error/80">
                      {errorMessage ?? t('errors.networkError')}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      leftIcon={<RefreshIcon width={14} height={14} />}
                      onClick={() => void regenerateMutation.mutateAsync()}
                      isLoading={regenerateMutation.isPending}
                    >
                      {t('meeting.tryAgain')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {liveStatus !== 'error' && liveStatus !== 'done' && (
              <ProcessingPanel status={liveStatus} />
            )}

            {liveStatus === 'done' && (
              <div className="grid h-[calc(100dvh-18rem)] min-h-[480px] gap-4 md:grid-cols-2">
                <div className="min-h-0">
                  {transcriptQuery.isLoading && (
                    <Skeleton className="h-full w-full rounded-2xl" />
                  )}
                  {transcriptQuery.data && (
                    <TranscriptView transcript={transcriptQuery.data} />
                  )}
                  {transcriptQuery.isError && (
                    <div className="rounded-2xl border border-error/40 bg-error/10 p-5 text-sm text-error">
                      {transcriptQuery.error?.message ?? t('errors.networkError')}
                    </div>
                  )}
                </div>
                <div className="min-h-0">
                  {summaryQuery.isLoading && (
                    <Skeleton className="h-full w-full rounded-2xl" />
                  )}
                  {summaryQuery.data && <SummaryPanel summary={summaryQuery.data} />}
                  {summaryQuery.isError && (
                    <div className="rounded-2xl border border-error/40 bg-error/10 p-5 text-sm text-error">
                      {summaryQuery.error?.message ?? t('errors.networkError')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {id && (
            <ShareModal
              meetingId={id}
              meetingTitle={title}
              isOpen={shareOpen}
              onClose={() => setShareOpen(false)}
            />
          )}

          <Modal
            isOpen={regenerateOpen}
            onClose={() => setRegenerateOpen(false)}
            title={t('meeting.regenerateConfirmTitle')}
            size="sm"
          >
            <p className="text-sm text-text-muted">
              {t('meeting.regenerateConfirmBody')}
            </p>
            {regenerateMutation.isError && (
              <p className="mt-3 text-sm text-error">
                {regenerateMutation.error?.message ?? t('errors.networkError')}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setRegenerateOpen(false)}
                disabled={regenerateMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleRegenerate}
                isLoading={regenerateMutation.isPending}
              >
                {t('meeting.regenerateConfirmAction')}
              </Button>
            </div>
          </Modal>

          <Modal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title={t('meeting.deleteConfirmTitle')}
            size="sm"
          >
            <p className="text-sm text-text-muted">
              {t('meeting.deleteConfirmBody', { title })}
            </p>
            {deleteMutation.isError && (
              <p className="mt-3 text-sm text-error">
                {deleteMutation.error?.message ?? t('errors.networkError')}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={deleteMutation.isPending}
              >
                {t('meeting.deleteConfirmAction')}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </section>
  );
}
