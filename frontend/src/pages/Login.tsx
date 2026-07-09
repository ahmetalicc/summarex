import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { env } from '../lib/env';
import { useAuth } from '../hooks/useAuth';
import { useLanguageStore } from '../store/languageStore';
import { Brand } from '../components/layout/Brand';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { HeroWaveform } from '../components/audio/HeroWaveform';

interface LocationState {
  from?: { pathname?: string };
}

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';
type SuccessPanel = 'checkEmail' | 'resetSent' | 'passwordUpdated';

export default function Login() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);

  const [isRecovery, setIsRecovery] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessPanel | null>(null);

  useEffect(() => {
    if (isRecovery) return;
    if (!session) return;
    const from = (location.state as LocationState | null)?.from?.pathname;
    navigate(from ?? '/dashboard', { replace: true });
  }, [session, navigate, location.state, isRecovery]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setMode('reset');
        setSuccess(null);
        setError(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function mapError(message: string): string {
    if (message.includes('Invalid login credentials')) return t('auth.errorInvalidCredentials');
    if (message.includes('already registered')) return t('auth.errorEmailInUse');
    if (message.includes('Password should be at least')) return t('auth.errorWeakPassword');
    if (message.includes('Email not confirmed')) return t('auth.errorEmailNotConfirmed');
    return t('auth.errorGeneric');
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) setError(mapError(signInError.message));
        // On success the useAuth listener fires and the redirect effect navigates.
      } else if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${env.APP_URL}/login`, data: { lang: language } },
        });
        if (signUpError) {
          setError(mapError(signUpError.message));
        } else if (!data.session) {
          // "Confirm email" is ON — no session yet.
          setSuccess('checkEmail');
        }
        // If a session is returned, the session effect redirects automatically.
      } else if (mode === 'reset') {
        if (newPassword !== confirmPassword) {
          setError(t('auth.errorPasswordMismatch'));
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          setError(mapError(updateError.message));
        } else {
          setIsRecovery(false);
          setSuccess('passwordUpdated');
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${env.APP_URL}/reset-password`,
        });
        if (resetError) setError(mapError(resetError.message));
        else setSuccess('resetSent');
      }
    } catch {
      setError(t('auth.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  const showPassword = mode === 'signin' || mode === 'signup';
  const submitLabel =
    mode === 'signin'
      ? t('auth.signInButton')
      : mode === 'signup'
        ? t('auth.signUpButton')
        : mode === 'reset'
          ? t('auth.updatePasswordButton')
          : t('auth.sendResetLink');
  const submitLoadingLabel =
    mode === 'signin'
      ? t('auth.signingIn')
      : mode === 'signup'
        ? t('auth.signingUp')
        : mode === 'reset'
          ? t('auth.updatingPassword')
          : t('auth.sendingReset');

  return (
    <section className="relative mx-auto grid min-h-[calc(100dvh-4rem-4rem)] max-w-7xl content-center gap-8 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-12 lg:gap-12">
      {(isLoading || session) && !isRecovery ? (
        <div className="col-span-full flex items-center justify-center">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : (
        <>
          {/* Left: Marketing panel with waveform */}
          <aside className="relative hidden overflow-hidden rounded-[2rem] border border-border bg-bg-surface/60 p-10 backdrop-blur-xl lg:col-span-6 lg:flex lg:flex-col lg:justify-between noise-texture">
            <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-32 top-40 opacity-40">
              <HeroWaveform className="h-full" barCount={80} variant="hero" />
            </div>

            <div className="relative">
              <Brand />
              <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {t('auth.brandEyebrow')}
              </p>
              <h2
                className="mt-4 font-display font-bold leading-[1.05] tracking-tight text-text"
                style={{ fontSize: 'clamp(2.25rem, 3.5vw, 3.25rem)' }}
              >
                {t('landing.heroTitle')}
              </h2>
            </div>

            <div className="relative mt-auto space-y-4">
              <div className="rounded-2xl border border-border bg-bg/50 p-4 backdrop-blur">
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-primary" />
                  {t('auth.whatYouGet')}
                </div>
                <ul className="grid gap-2 text-sm text-text">
                  <li className="flex items-center gap-2.5"><span className="h-1 w-1 rounded-full bg-primary" />{t('landing.demoOverview')}</li>
                  <li className="flex items-center gap-2.5"><span className="h-1 w-1 rounded-full bg-primary" />{t('landing.demoDecisions')}</li>
                  <li className="flex items-center gap-2.5"><span className="h-1 w-1 rounded-full bg-accent" />{t('landing.demoActions')}</li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Right: Form */}
          <div className="relative flex items-center justify-center lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md"
            >
              <div className="rounded-3xl border border-border bg-bg-surface/80 p-8 backdrop-blur-xl sm:p-10 gradient-border">
                <div className="mb-8 flex flex-col items-start gap-3 lg:hidden">
                  <Brand />
                </div>
                <div className="mb-8 flex flex-col gap-2">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
                    {mode === 'signin' ? t('auth.eyebrowSignIn') : mode === 'signup' ? t('auth.eyebrowSignUp') : mode === 'reset' ? t('auth.eyebrowReset') : t('auth.eyebrowRecover')}
                  </p>
                  <h1
                    className="font-display font-bold tracking-tight text-text"
                    style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)', lineHeight: 1.05 }}
                  >
                    {t('auth.welcomeTitle')}
                  </h1>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {mode === 'reset' ? t('auth.resetSubtitle') : t('auth.welcomeSubtitle')}
                  </p>
                </div>

                {success ? (
                  <div className="flex flex-col gap-4">
                    <h2 className="font-display text-xl font-bold text-text">
                      {success === 'checkEmail'
                        ? t('auth.checkEmailTitle')
                        : success === 'resetSent'
                          ? t('auth.resetSentTitle')
                          : t('auth.passwordUpdatedTitle')}
                    </h2>
                    <p className="text-sm leading-relaxed text-text-muted">
                      {success === 'checkEmail'
                        ? t('auth.checkEmailBody')
                        : success === 'resetSent'
                          ? t('auth.resetSentBody')
                          : t('auth.passwordUpdatedBody')}
                    </p>
                    {success === 'passwordUpdated' ? (
                      <Button onClick={() => navigate('/dashboard')} className="mt-2 w-full">
                        {t('auth.continueToDashboard')}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                      >
                        ← {t('auth.backToSignIn')}
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    {mode !== 'reset' && (
                      <Input
                        label={t('auth.email')}
                        type="email"
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        required
                      />
                    )}

                    {showPassword && (
                      <Input
                        label={t('auth.password')}
                        type="password"
                        passwordToggle
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder={t('auth.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        required
                      />
                    )}

                    {mode === 'reset' && (
                      <>
                        <Input
                          label={t('auth.newPassword')}
                          type="password"
                          passwordToggle
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            if (error) setError(null);
                          }}
                          required
                        />
                        <Input
                          label={t('auth.confirmPassword')}
                          type="password"
                          passwordToggle
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (error) setError(null);
                          }}
                          required
                        />
                      </>
                    )}

                    {error && (
                      <div role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                        {error}
                      </div>
                    )}

                    <Button type="submit" size="lg" isLoading={submitting} className="mt-2 w-full">
                      {submitting ? submitLoadingLabel : submitLabel}
                    </Button>

                    <div className="flex flex-col items-center gap-3 border-t border-border/60 pt-5 text-sm">
                      {mode === 'signin' && (
                        <>
                          <button
                            type="button"
                            onClick={() => switchMode('forgot')}
                            className="text-text-muted transition-colors hover:text-text"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                          <button
                            type="button"
                            onClick={() => switchMode('signup')}
                            className="font-medium text-primary transition-colors hover:text-primary-hover"
                          >
                            {t('auth.toSignUp')} →
                          </button>
                        </>
                      )}
                      {mode === 'signup' && (
                        <button
                          type="button"
                          onClick={() => switchMode('signin')}
                          className="font-medium text-primary transition-colors hover:text-primary-hover"
                        >
                          ← {t('auth.toSignIn')}
                        </button>
                      )}
                      {mode === 'forgot' && (
                        <button
                          type="button"
                          onClick={() => switchMode('signin')}
                          className="font-medium text-primary transition-colors hover:text-primary-hover"
                        >
                          ← {t('auth.backToSignIn')}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </section>
  );
}
