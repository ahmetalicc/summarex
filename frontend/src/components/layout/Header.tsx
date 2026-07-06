import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { CloseIcon, MenuIcon } from './Icons';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative text-sm font-medium tracking-tight transition-colors',
    isActive
      ? 'text-text after:absolute after:-bottom-[19px] after:left-0 after:h-[2px] after:w-full after:bg-primary'
      : 'text-text-muted hover:text-text',
  );

export function Header() {
  const { session, isLoading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = !!session;
  const isPublic = location.pathname.startsWith('/shared/');

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b transition-all duration-200',
        scrolled
          ? 'border-border/70 bg-bg/85 backdrop-blur-2xl shadow-[0_1px_0_0_rgb(var(--color-border)/0.4)]'
          : 'border-transparent bg-bg/60 backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Brand />
          {loggedIn && !isPublic && (
            <nav className="hidden items-center gap-7 md:flex">
              <NavLink to="/dashboard" className={navLinkClass}>
                {t('common.dashboard')}
              </NavLink>
              <NavLink to="/summarize" className={navLinkClass}>
                {t('common.summarize')}
              </NavLink>
              <NavLink to="/transcribe" className={navLinkClass}>
                {t('common.transcribe')}
              </NavLink>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {!isLoading && !isPublic &&
            (loggedIn ? (
              <UserMenu />
            ) : (
              <Link to="/login" className="hidden md:inline-flex">
                <Button size="sm">{t('common.signIn')}</Button>
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t('common.closeMenu') : t('common.openMenu')}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-surface text-text-muted transition-colors hover:text-text md:hidden"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border/60 bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
              {loggedIn && !isPublic && (
                <nav className="flex flex-col gap-1">
                  <NavLink
                    to="/dashboard"
                    className="rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-surface"
                  >
                    {t('common.dashboard')}
                  </NavLink>
                  <NavLink
                    to="/summarize"
                    className="rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-surface"
                  >
                    {t('common.summarize')}
                  </NavLink>
                  <NavLink
                    to="/transcribe"
                    className="rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-surface"
                  >
                    {t('common.transcribe')}
                  </NavLink>
                </nav>
              )}
              <div className="flex items-center justify-between gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              {!loggedIn && !isPublic && (
                <Link to="/login">
                  <Button className="w-full">{t('common.signIn')}</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
