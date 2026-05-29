import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { env } from '../lib/env';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Brand } from '../components/layout/Brand';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface LocationState {
  from?: { pathname?: string };
}

type Mode = 'signin' | 'signup' | 'forgot';
type SuccessPanel = 'checkEmail' | 'resetSent';

export default function Login() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!session) return;
    const from = (location.state as LocationState | null)?.from?.pathname;
    navigate(from ?? '/dashboard', { replace: true });
  }, [session, navigate, location.state]);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessPanel | null>(null);

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
          options: { emailRedirectTo: `${env.APP_URL}/login` },
        });
        if (signUpError) {
          setError(mapError(signUpError.message));
        } else if (!data.session) {
          // "Confirm email" is ON — no session yet.
          setSuccess('checkEmail');
        }
        // If a session is returned, the session effect redirects automatically.
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${env.APP_URL}/login`,
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
        : t('auth.sendResetLink');
  const submitLoadingLabel =
    mode === 'signin'
      ? t('auth.signingIn')
      : mode === 'signup'
        ? t('auth.signingUp')
        : t('auth.sendingReset');

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem-4rem)] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
      {isLoading || session ? (
        <Spinner size="lg" className="text-primary" />
      ) : (
        <Card className="w-full">
          <CardContent className="p-7 sm:p-9">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <Brand />
              <h1 className="font-display text-2xl font-bold text-text">
                {t('auth.welcomeTitle')}
              </h1>
              <p className="text-sm text-text-muted">{t('auth.welcomeSubtitle')}</p>
            </div>

            {success ? (
              <div className="flex flex-col gap-4 text-center">
                <h2 className="font-display text-lg font-semibold text-text">
                  {success === 'checkEmail'
                    ? t('auth.checkEmailTitle')
                    : t('auth.resetSentTitle')}
                </h2>
                <p className="text-sm text-text-muted">
                  {success === 'checkEmail'
                    ? t('auth.checkEmailBody')
                    : t('auth.resetSentBody')}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  {t('auth.backToSignIn')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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

                {error && (
                  <p role="alert" className="text-sm text-error">
                    {error}
                  </p>
                )}

                <Button type="submit" isLoading={submitting} className="w-full">
                  {submitting ? submitLoadingLabel : submitLabel}
                </Button>

                <div className="flex flex-col items-center gap-2 pt-1 text-sm">
                  {mode === 'signin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-text-muted hover:text-text"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-medium text-primary hover:text-primary-hover"
                      >
                        {t('auth.toSignUp')}
                      </button>
                    </>
                  )}
                  {mode === 'signup' && (
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      {t('auth.toSignIn')}
                    </button>
                  )}
                  {mode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      {t('auth.backToSignIn')}
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
