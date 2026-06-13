import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { MeetingStatus } from '../../types/meeting';

export type BadgeVariant = 'neutral' | 'info' | 'warning' | 'success' | 'error';

const VARIANTS: Record<BadgeVariant, { dot: string; pill: string }> = {
  neutral: { dot: 'bg-text-muted', pill: 'bg-bg-elevated text-text-muted border-border' },
  info: { dot: 'bg-sky-400', pill: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  warning: { dot: 'bg-accent', pill: 'bg-accent/10 text-accent border-accent/30' },
  success: { dot: 'bg-success', pill: 'bg-success/10 text-success border-success/30' },
  error: { dot: 'bg-error', pill: 'bg-error/10 text-error border-error/30' },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = 'neutral',
  dot = true,
  className,
  children,
  ...rest
}: BadgeProps) {
  const v = VARIANTS[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        v.pill,
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />}
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: MeetingStatus): BadgeVariant {
  switch (status) {
    case 'queued':
      return 'neutral';
    case 'transcribing':
      return 'info';
    case 'transcribed':
      return 'success';
    case 'summarizing':
      return 'warning';
    case 'done':
      return 'success';
    case 'error':
      return 'error';
  }
}
