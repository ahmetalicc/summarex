import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Badge, statusToBadgeVariant } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { TrashIcon } from '../layout/Icons';
import { cn } from '../../lib/utils';
import { displayTitle } from '../../lib/meetingTitle';
import type { Meeting, MeetingStatus } from '../../types/meeting';
import { useDeleteMeeting } from '../../hooks/useMeetings';

interface MeetingCardProps {
  meeting: Meeting;
}

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

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ACTIVE_STATUSES: MeetingStatus[] = ['queued', 'transcribing', 'summarizing'];

export function MeetingCard({ meeting }: MeetingCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const deleteMutation = useDeleteMeeting();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isActive = ACTIVE_STATUSES.includes(meeting.status);
  const isClickable = !isActive;

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const createdAt = meeting.created_at ? dateFmt.format(new Date(meeting.created_at)) : '—';

  const openDetail = () => {
    if (!isClickable) return;
    navigate(`/meetings/${meeting.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  };

  const openConfirm = (e: MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(meeting.id);
      setConfirmOpen(false);
    } catch {
      /* mutation surfaces error in UI */
    }
  };

  return (
    <>
      <motion.div whileHover={isClickable ? { y: -2 } : undefined}>
        <Card
          glass
          hoverable={isClickable}
          role={isClickable ? 'link' : undefined}
          tabIndex={isClickable ? 0 : -1}
          onClick={openDetail}
          onKeyDown={handleKeyDown}
          aria-disabled={!isClickable}
          className={cn(
            'group relative flex h-full flex-col gap-4 p-5 transition-shadow',
            isClickable
              ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:shadow-[0_0_0_1px_rgba(0,212,170,0.25)]'
              : 'cursor-default opacity-80',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-base font-semibold text-text">
              {displayTitle(meeting.title, t)}
            </h3>
            <button
              type="button"
              onClick={openConfirm}
              aria-label={t('dashboard.deleteConfirmAction')}
              className="opacity-0 transition-opacity hover:text-error group-hover:opacity-100 focus:opacity-100 focus:outline-none"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={statusToBadgeVariant(meeting.status)}>
              {t(statusKey(meeting.status))}
            </Badge>
            {isActive && <Spinner size="sm" className="text-text-muted" />}
          </div>

          <div className="mt-auto flex items-center justify-between text-xs text-text-muted">
            <span>{createdAt}</span>
            <span className="font-mono tabular-nums">
              {formatDuration(meeting.duration_seconds)}
            </span>
          </div>
        </Card>
      </motion.div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('dashboard.deleteConfirmTitle')}
        size="sm"
      >
        <p className="text-sm text-text-muted">
          {t('dashboard.deleteConfirmBody', {
            title: displayTitle(meeting.title, t),
          })}
        </p>
        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-error">
            {deleteMutation.error?.message ?? t('errors.networkError')}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={deleteMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            {t('dashboard.deleteConfirmAction')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
