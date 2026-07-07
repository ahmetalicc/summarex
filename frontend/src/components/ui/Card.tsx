import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
  gradient?: boolean;
  children: ReactNode;
}

export function Card({
  glass = false,
  hoverable = false,
  gradient = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-3xl border border-border',
        glass ? 'bg-bg-surface/60 backdrop-blur-xl' : 'bg-bg-surface',
        gradient && 'gradient-border',
        hoverable &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_20px_60px_-20px_rgb(var(--color-primary)/0.3)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-xl font-semibold text-text', className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-text-muted', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-3', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-border/60 p-4', className)} {...rest} />
  );
}
