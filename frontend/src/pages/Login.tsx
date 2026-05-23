import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Brand } from '../components/layout/Brand';
import { Spinner } from '../components/ui/Spinner';

interface LocationState {
  from?: { pathname?: string };
}

export default function Login() {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!session) return;
    const from = (location.state as LocationState | null)?.from?.pathname;
    navigate(from ?? '/dashboard', { replace: true });
  }, [session, navigate, location.state]);

  const localization =
    i18n.language === 'tr'
      ? {
          variables: {
            sign_in: {
              email_label: t('auth.email'),
              password_label: t('auth.password'),
              email_input_placeholder: t('auth.emailPlaceholder'),
              password_input_placeholder: t('auth.passwordPlaceholder'),
              button_label: t('auth.signInButton'),
              loading_button_label: t('auth.signingIn'),
              link_text: t('auth.toSignUp'),
            },
            sign_up: {
              email_label: t('auth.email'),
              password_label: t('auth.password'),
              email_input_placeholder: t('auth.emailPlaceholder'),
              password_input_placeholder: t('auth.passwordPlaceholder'),
              button_label: t('auth.signUpButton'),
              loading_button_label: t('auth.signingUp'),
              link_text: t('auth.toSignIn'),
            },
            forgotten_password: {
              email_label: t('auth.email'),
              button_label: t('auth.sendResetLink'),
              link_text: t('auth.forgotPassword'),
            },
          },
        }
      : undefined;

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
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#00D4AA',
                      brandAccent: '#00B894',
                      brandButtonText: '#0A0F1C',
                      defaultButtonBackground: '#141B2D',
                      defaultButtonBackgroundHover: '#1B2236',
                      defaultButtonBorder: '#1E293B',
                      defaultButtonText: '#E2E8F0',
                      dividerBackground: '#1E293B',
                      inputBackground: '#141B2D',
                      inputBorder: '#1E293B',
                      inputBorderHover: '#2A3756',
                      inputBorderFocus: '#00D4AA',
                      inputText: '#E2E8F0',
                      inputLabelText: '#E2E8F0',
                      inputPlaceholder: '#64748B',
                      messageText: '#E2E8F0',
                      messageTextDanger: '#EF4444',
                      anchorTextColor: '#94A3B8',
                      anchorTextHoverColor: '#00D4AA',
                    },
                    radii: {
                      borderRadiusButton: '0.75rem',
                      buttonBorderRadius: '0.75rem',
                      inputBorderRadius: '0.75rem',
                    },
                    fonts: {
                      bodyFontFamily: '"Plus Jakarta Sans", sans-serif',
                      buttonFontFamily: '"Plus Jakarta Sans", sans-serif',
                      inputFontFamily: '"Plus Jakarta Sans", sans-serif',
                      labelFontFamily: '"Plus Jakarta Sans", sans-serif',
                    },
                  },
                },
              }}
              theme="dark"
              localization={localization}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
}
