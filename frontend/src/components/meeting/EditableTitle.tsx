import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface EditableTitleProps {
  value: string;
  onSubmit: (next: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableTitle({
  value,
  onSubmit,
  className,
  placeholder,
  disabled,
}: EditableTitleProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === value) {
      setDraft(value);
      return;
    }
    try {
      await onSubmit(trimmed);
    } catch {
      setDraft(value);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={onKeyDown}
        maxLength={120}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-md border border-border bg-bg-elevated px-2 py-1 font-display text-2xl font-bold text-text outline-none ring-2 ring-primary/30 focus:border-primary sm:text-3xl',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      aria-label={t('meeting.editTitle')}
      className={cn(
        'group inline-flex items-center gap-2 rounded-md px-2 py-1 text-left font-display text-2xl font-bold text-text transition-colors hover:bg-bg-elevated/60 sm:text-3xl',
        disabled && 'cursor-default opacity-80 hover:bg-transparent',
        className,
      )}
    >
      <span className="truncate">{value || placeholder || t('meeting.untitled')}</span>
      {!disabled && (
        <span className="text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
          {t('meeting.editTitle')}
        </span>
      )}
    </button>
  );
}
