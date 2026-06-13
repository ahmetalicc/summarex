import { useTranslation } from 'react-i18next';
import { useMeetingsList } from '../../hooks/useMeetings';
import { useSummarizeMeeting } from '../../hooks/useMeetingMutations';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { FileTextIcon, SparklesIcon } from '../layout/Icons';
import { displayTitle } from '../../lib/meetingTitle';
import type { Meeting } from '../../types/meeting';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function TranscriptPicker() {
  const { t, i18n } = useTranslation();
  const query = useMeetingsList({ limit: 50, offset: 0 });
  const summarize = useSummarizeMeeting();
  const transcripts = (query.data ?? []).filter((m) => m.status === 'transcribed');

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="text-text-muted" />
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-bg-elevated/30 px-4 py-6 text-center text-sm text-text-muted">
        {t('summarize.pickerEmpty')}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {transcripts.map((m: Meeting) => (
        <li key={m.id}>
          <Card glass className="flex items-center gap-4 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon width={18} height={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {displayTitle(m.title, t)}
              </p>
              <p className="text-xs text-text-muted">
                {m.created_at ? dateFmt.format(new Date(m.created_at)) : '—'} ·{' '}
                {formatDuration(m.duration_seconds)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => summarize.mutate(m.id)}
              isLoading={summarize.isPending && summarize.variables === m.id}
              disabled={summarize.isPending}
              leftIcon={<SparklesIcon width={14} height={14} />}
            >
              {t('summarize.pickerAction')}
            </Button>
          </Card>
        </li>
      ))}
      {summarize.isError && (
        <p className="text-sm text-error">
          {summarize.error?.message ?? t('errors.networkError')}
        </p>
      )}
    </ul>
  );
}
