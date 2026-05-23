import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  passwordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, passwordToggle, type = 'text', id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const effectiveType = passwordToggle && type === 'password' && show ? 'text' : type;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center rounded-xl border bg-bg-surface text-text transition-colors',
          error ? 'border-error focus-within:border-error' : 'border-border focus-within:border-primary',
          'focus-within:ring-2 focus-within:ring-primary/30',
        )}
      >
        {leftIcon && <span className="pl-3 text-text-muted">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${inputId}-desc` : undefined}
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-sm placeholder:text-text-muted/70 focus:outline-none',
            leftIcon && 'pl-2',
            className,
          )}
          {...rest}
        />
        {passwordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="px-3 text-xs font-medium text-text-muted hover:text-text"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {(hint || error) && (
        <p
          id={`${inputId}-desc`}
          className={cn('text-xs', error ? 'text-error' : 'text-text-muted')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
