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
        'relative inline-flex h-10 items-center rounded-xl border border-border bg-bg-surface/60 p-1 font-mono text-[11px] font-semibold backdrop-blur',
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
              'relative z-10 rounded-lg px-3 py-1.5 tracking-wider transition-colors',
              active
                ? 'bg-primary text-bg shadow-sm'
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
