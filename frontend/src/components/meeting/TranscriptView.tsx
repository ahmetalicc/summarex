import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { formatSeconds } from '../../lib/format';
import { Badge } from '../ui/Badge';
import { CheckIcon, CopyIcon } from '../layout/Icons';
import type { Transcript } from '../../types/transcript';
import type { PublicTranscript } from '../../types/share';

interface TranscriptViewProps {
  transcript: Transcript | PublicTranscript;
  className?: string;
}

export function TranscriptView({ transcript, className }: TranscriptViewProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<'all' | string | null>(null);

  const segments = transcript.segments ?? [];

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(transcript.full_text ?? '');
      setCopied('all');
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* no clipboard permission — silently noop */
    }
  };

  const handleCopyTimestamp = async (key: string, seconds: number) => {
    try {
      await navigator.clipboard.writeText(formatSeconds(seconds));
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      /* noop */
    }
  };

  return (
    <section
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface/60 backdrop-blur',
        className,
      )}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-bg-surface/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            {t('meeting.transcriptTitle')}
          </h2>
          <Badge variant="info" dot={false} className="uppercase">
            {(transcript.language ?? 'auto').toString()}
          </Badge>
          <span className="text-xs text-text-muted">
            {t('meeting.transcriptSegmentCount', { count: segments.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          {copied === 'all' ? (
            <>
              <CheckIcon width={14} height={14} />
              {t('meeting.transcriptCopied')}
            </>
          ) : (
            <>
              <CopyIcon width={14} height={14} />
              {t('meeting.transcriptCopy')}
            </>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {segments.length > 0 ? (
          <ol className="space-y-2">
            {segments.map((seg, idx) => {
              const key = `${idx}-${seg.start}`;
              return (
                <li
                  key={key}
                  className="group flex gap-3 rounded-lg border-l-2 border-transparent px-2 py-1.5 transition-colors hover:border-primary/50 hover:bg-bg-elevated/40"
                >
                  <button
                    type="button"
                    onClick={() => handleCopyTimestamp(key, seg.start)}
                    aria-label={t('meeting.transcriptCopyTimestamp')}
                    className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-md border border-border/80 bg-bg-elevated px-1.5 font-mono text-[10px] text-text-muted transition-colors hover:text-text"
                  >
                    {copied === key ? (
                      <CheckIcon width={12} height={12} />
                    ) : (
                      formatSeconds(seg.start)
                    )}
                  </button>
                  <p className="text-sm leading-relaxed text-text">{seg.text}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
            {transcript.full_text || t('meeting.transcriptEmpty')}
          </p>
        )}
      </div>
    </section>
  );
}
