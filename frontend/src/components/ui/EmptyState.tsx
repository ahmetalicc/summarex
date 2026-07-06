import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-dashed border-border/70 bg-bg-surface/40 px-6 py-16 text-center backdrop-blur',
        className,
      )}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-bg-elevated text-primary">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-bold text-text">{title}</h3>
        {description && (
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
