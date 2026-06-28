import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent } from '../components/ui/Card';
import { Brand } from '../components/layout/Brand';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    document.title = `${t('auth.passwordUpdatedTitle')} — Summarex`;
  }, [t]);

  useEffect(() => {
    const hash = window.location.hash;
    const hasRecoveryToken = hash.includes('type=recovery') || hash.includes('access_token');
    if (!hasRecoveryToken) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          setInvalidLink(true);
        }
      });
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('auth.errorPasswordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message || t('auth.errorGeneric'));
      } else {
        setDone(true);
      }
    } catch {
      setError(t('auth.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem-4rem)] max-w-md flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
      <Card className="w-full">
        <CardContent className="p-7 sm:p-9">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Brand />
            <h1 className="font-display text-2xl font-bold text-text">
              {t('auth.welcomeTitle')}
            </h1>
            <p className="text-sm text-text-muted">{t('auth.resetSubtitle')}</p>
          </div>

          {invalidLink ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm text-text-muted">{t('auth.resetLinkInvalid')}</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                {t('auth.backToSignIn')}
              </button>
            </div>
          ) : done ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="font-display text-lg font-semibold text-text">
                {t('auth.passwordUpdatedTitle')}
              </h2>
              <p className="text-sm text-text-muted">{t('auth.passwordUpdatedBody')}</p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium text-primary hover:text-primary-hover"
              >
                {t('auth.continueToDashboard')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
              {error && (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              )}
              <Button type="submit" isLoading={submitting} className="w-full">
                {submitting ? t('auth.updatingPassword') : t('auth.updatePasswordButton')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
