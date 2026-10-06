/** Must match the Supabase project's minimum password length (and the web app's copy: "at least 6 characters"). */
export const MIN_PASSWORD_LENGTH = 6;

interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/**
 * Maps a Supabase auth error to a localized `auth.*` key (port of web's mapError in Login.tsx,
 * plus rate-limit / network / same-password). Never surface error.message to users.
 * Prefers the stable `code` field and falls back to message sniffing like web does.
 */
export function authErrorKey(error: AuthErrorLike | null | undefined): string {
  const message = error?.message ?? '';
  const code = error?.code ?? '';

  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) return 'auth.errorInvalidCredentials';
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) return 'auth.errorEmailInUse';
  if (code === 'weak_password' || message.includes('Password should be at least')) return 'auth.errorWeakPassword';
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) return 'auth.errorEmailNotConfirmed';
  if (code === 'same_password' || message.includes('should be different from the old password')) return 'auth.errorSamePassword';
  if (
    error?.status === 429 ||
    code.startsWith('over_') ||
    /rate limit|too many requests|for security purposes/i.test(message)
  ) {
    return 'auth.errorRateLimit';
  }
  if (error?.status === 0 || /network request failed|failed to fetch|fetch failed/i.test(message)) return 'auth.errorNetwork';
  return 'auth.errorGeneric';
}

export function isEmailNotConfirmed(error: AuthErrorLike | null | undefined): boolean {
  return authErrorKey(error) === 'auth.errorEmailNotConfirmed';
}
