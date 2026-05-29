import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from '../layout/Icons';
import { cn } from '../../lib/utils';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  badge,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('border-b border-border/40 last:border-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 bg-bg-surface/85 px-5 py-3 text-left backdrop-blur transition-colors hover:bg-bg-elevated/60"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text">
          {title}
          {badge}
        </span>
        <ChevronDownIcon
          width={16}
          height={16}
          className={cn(
            'text-text-muted transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
