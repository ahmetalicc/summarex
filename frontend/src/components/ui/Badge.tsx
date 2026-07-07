import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { MeetingStatus } from '../../types/meeting';

export type BadgeVariant = 'neutral' | 'info' | 'warning' | 'success' | 'error' | 'accent';

const VARIANTS: Record<BadgeVariant, { dot: string; pill: string }> = {
  neutral: { dot: 'bg-text-muted', pill: 'bg-bg-elevated text-text-muted border-border' },
  info: { dot: 'bg-primary', pill: 'bg-primary/10 text-primary border-primary/30' },
  warning: { dot: 'bg-accent', pill: 'bg-accent/15 text-accent border-accent/40' },
  success: { dot: 'bg-success', pill: 'bg-success/15 text-success border-success/40' },
  error: { dot: 'bg-error', pill: 'bg-error/10 text-error border-error/30' },
  accent: { dot: 'bg-accent', pill: 'bg-accent/15 text-accent border-accent/40' },
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest',
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
