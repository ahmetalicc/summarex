import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckIcon } from '../layout/Icons';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';
import type { MeetingStatus } from '../../types/meeting';

interface ProcessingPanelProps {
  status: MeetingStatus;
}

const STEPS = [
  { id: 'uploaded', key: 'meeting.processing.steps.uploaded' },
  { id: 'transcribing', key: 'meeting.processing.steps.transcribing' },
  { id: 'summarizing', key: 'meeting.processing.steps.summarizing' },
  { id: 'done', key: 'meeting.processing.steps.done' },
] as const;

function stepIndex(status: MeetingStatus): number {
  switch (status) {
    case 'queued':
      return 0;
    case 'transcribing':
      return 1;
    case 'summarizing':
      return 2;
    case 'done':
      return 3;
    case 'error':
      return -1;
  }
}

export function ProcessingPanel({ status }: ProcessingPanelProps) {
  const { t } = useTranslation();
  const current = stepIndex(status);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 rounded-2xl border border-border bg-bg-surface/50 px-6 py-14 text-center backdrop-blur">
      <div className="flex items-center gap-3">
        <Spinner size="lg" className="text-primary" />
        <div className="text-left">
          <h2 className="font-display text-xl font-semibold text-text">
            {t('meeting.processing.title')}
          </h2>
          <p className="text-sm text-text-muted">
            {t('meeting.processing.subtitle')}
          </p>
        </div>
      </div>

      <ol className="w-full max-w-md space-y-3">
        {STEPS.map((step, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors',
                  done && 'border-success bg-success/15 text-success',
                  active && 'border-primary bg-primary/15 text-primary',
                  !done && !active && 'border-border bg-bg-elevated text-text-muted',
                )}
              >
                {done ? (
                  <CheckIcon width={14} height={14} />
                ) : active ? (
                  <motion.span
                    className="h-2 w-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={cn(
                  'text-sm transition-colors',
                  done && 'text-text-muted line-through',
                  active && 'font-medium text-text',
                  !done && !active && 'text-text-muted',
                )}
              >
                {t(step.key)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
