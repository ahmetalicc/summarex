import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-bg font-semibold hover:bg-primary-hover focus-visible:ring-primary shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_8px_24px_-8px_rgb(var(--color-primary)/0.55)] hover:shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_10px_32px_-6px_rgb(var(--color-primary)/0.7)]',
  accent:
    'bg-accent text-bg font-semibold hover:bg-accent-hover focus-visible:ring-accent shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset,0_8px_24px_-8px_rgb(var(--color-accent)/0.55)]',
  secondary:
    'border border-border-strong bg-bg-surface/70 text-text hover:bg-bg-elevated hover:border-primary/50 backdrop-blur focus-visible:ring-primary/60',
  ghost:
    'bg-transparent text-text hover:bg-bg-surface/80 focus-visible:ring-primary/60',
  danger:
    'bg-error text-white hover:opacity-90 focus-visible:ring-error/60',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'group/btn relative inline-flex items-center justify-center rounded-full font-medium tracking-tight transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
