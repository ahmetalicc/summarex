import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { CollapsibleSection } from './CollapsibleSection';
import type { Summary } from '../../types/summary';
import type { PublicSummary } from '../../types/share';

type Sentiment = NonNullable<Summary['sentiment']>;

const SENTIMENT_VARIANT: Record<Sentiment, BadgeVariant> = {
  productive: 'success',
  tense: 'error',
  casual: 'warning',
  neutral: 'neutral',
};

const SENTIMENT_KEY: Record<Sentiment, string> = {
  productive: 'meeting.summary.sentimentProductive',
  tense: 'meeting.summary.sentimentTense',
  casual: 'meeting.summary.sentimentCasual',
  neutral: 'meeting.summary.sentimentNeutral',
};

interface SummaryPanelProps {
  summary: Summary | PublicSummary;
  className?: string;
}

export function SummaryPanel({ summary, className }: SummaryPanelProps) {
  const { t } = useTranslation();

  const overviewParagraphs = (summary.overview ?? '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface/60 backdrop-blur',
        className,
      )}
    >
      <header className="border-b border-border/60 bg-bg-surface/80 px-5 py-3 backdrop-blur">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          {t('meeting.summaryTitle')}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        <CollapsibleSection title={t('meeting.summary.sections.overview')}>
          {overviewParagraphs.length > 0 ? (
            <div className="space-y-3 text-sm leading-relaxed text-text">
              {overviewParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={t('meeting.summary.sections.decisions')}
          badge={
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
              {summary.decisions.length}
            </span>
          }
        >
          {summary.decisions.length > 0 ? (
            <ol className="space-y-2 text-sm text-text">
              {summary.decisions.map((d, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{d}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={t('meeting.summary.sections.actionItems')}
          badge={
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-muted">
              {summary.action_items.length}
            </span>
          }
        >
          {summary.action_items.length > 0 ? (
            <ul className="space-y-2">
              {summary.action_items.map((item, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-bg-elevated/40 p-3"
                >
                  <p className="text-sm text-text">{item.task}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <Badge variant={item.assignee ? 'warning' : 'neutral'} dot={false}>
                      {item.assignee
                        ? `@${item.assignee}`
                        : t('meeting.summary.assigneeUnassigned')}
                    </Badge>
                    <Badge variant={item.deadline ? 'info' : 'neutral'} dot={false}>
                      {item.deadline ?? t('meeting.summary.noDeadline')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={t('meeting.summary.sections.topics')}>
          {summary.topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-bg-elevated px-3 py-1 text-xs text-text-muted"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={t('meeting.summary.sections.sentiment')}>
          {summary.sentiment ? (
            <Badge variant={SENTIMENT_VARIANT[summary.sentiment]}>
              {t(SENTIMENT_KEY[summary.sentiment])}
            </Badge>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={t('meeting.summary.sections.keyQuotes')}>
          {summary.key_quotes.length > 0 ? (
            <ul className="space-y-3">
              {summary.key_quotes.map((q, i) => (
                <li
                  key={i}
                  className="border-l-2 border-accent/70 pl-3 text-sm italic leading-relaxed text-text"
                >
                  “{q}”
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{t('meeting.summary.empty')}</p>
          )}
        </CollapsibleSection>
      </div>
    </section>
  );
}
