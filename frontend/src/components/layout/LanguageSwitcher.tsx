import { useLanguageStore, type Language } from '../../store/languageStore';
import { cn } from '../../lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

const LANGS: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
];

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex h-9 items-center rounded-lg border border-border bg-bg-surface p-0.5 text-xs font-semibold',
        className,
      )}
    >
      {LANGS.map((l) => {
        const active = l.code === language;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={active}
            className={cn(
              'rounded-md px-2.5 py-1 transition-colors',
              active
                ? 'bg-primary text-bg'
                : 'text-text-muted hover:text-text',
            )}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
