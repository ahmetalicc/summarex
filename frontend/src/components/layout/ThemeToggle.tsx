import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../lib/utils';
import { MoonIcon, SunIcon } from './Icons';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('common.toggleTheme')}
      title={t('common.toggleTheme')}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-surface/60 text-text-muted backdrop-blur transition-all hover:text-primary hover:border-primary/40',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 grid place-items-center"
          >
            <MoonIcon />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 grid place-items-center"
          >
            <SunIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
