import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { ChevronDownIcon } from './Icons';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { deleteAccount } from '../../lib/api';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const email = user.email ?? '';
  const initial = (email[0] ?? '?').toUpperCase();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  const openDeleteConfirm = () => {
    setOpen(false);
    setDeleteError(null);
    setConfirmOpen(true);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await signOut();
      navigate('/', { replace: true });
    } catch {
      setDeleting(false);
      setDeleteError(t('account.deleteError'));
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-bg-surface px-1.5 pr-2 text-sm text-text transition-colors hover:bg-bg-elevated',
        )}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-primary-hover text-xs font-bold text-bg">
          {initial}
        </span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl"
          >
            <div className="border-b border-border/60 px-4 py-3 text-xs">
              <p className="text-text-muted">{t('common.signedInAs')}</p>
              <p className="truncate font-medium text-text">{email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-text transition-colors hover:bg-bg-elevated"
            >
              {t('common.signOut')}
            </button>
            <button
              type="button"
              onClick={openDeleteConfirm}
              role="menuitem"
              className="block w-full border-t border-border/60 px-4 py-2.5 text-left text-sm text-error transition-colors hover:bg-error/10"
            >
              {t('account.delete')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={confirmOpen}
        onClose={() => { if (!deleting) setConfirmOpen(false); }}
        title={t('account.deleteConfirmTitle')}
        size="sm"
      >
        <p className="text-sm leading-relaxed text-text-muted">{t('account.deleteConfirmBody')}</p>
        {deleteError && <p className="mt-3 text-sm text-error">{deleteError}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount} isLoading={deleting}>
            {t('account.deleteConfirmAction')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
