import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const effectiveType = passwordToggle && type === 'password' && show ? 'text' : type;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center rounded-xl border bg-bg-surface/60 text-text backdrop-blur transition-all',
          error
            ? 'border-error focus-within:border-error focus-within:ring-2 focus-within:ring-error/25'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
        )}
      >
        {leftIcon && <span className="pl-3.5 text-text-muted">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${inputId}-desc` : undefined}
          className={cn(
            'flex-1 bg-transparent px-3.5 py-3 text-[15px] placeholder:text-text-muted/60 focus:outline-none',
            leftIcon && 'pl-2.5',
            className,
          )}
          {...rest}
        />
        {passwordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="p-2 pr-3.5 text-text-muted transition-colors hover:text-primary"
            aria-label={show ? t('common.hide') : t('common.show')}
          >
            {show ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
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
