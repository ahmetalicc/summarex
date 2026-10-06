import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { parseAuthUrl, type AuthLink, type AuthLinkKind } from '@/lib/authUrl';

/**
 * Turns Supabase auth deep links (summarex://reset-password, summarex://confirm) into a session.
 * Lives in the root layout so it runs on cold start (getInitialURL) and warm start (url event)
 * regardless of which screen is mounted; screens read the outcome via useAuthLink().
 *
 * supabase.ts keeps detectSessionInUrl:false (correct for React Native), so this is the only place
 * that consumes the tokens.
 */
export type AuthLinkStatus =
  | 'checking'    // haven't looked at the launch URL yet
  | 'idle'        // no auth link seen
  | 'processing'  // exchanging tokens for a session
  | 'success'     // session established
  | 'error';      // link invalid/expired or the exchange failed

interface AuthLinkState {
  status: AuthLinkStatus;
  kind: AuthLinkKind | null;
  errorCode: string | null;
}

interface AuthLinkContextValue extends AuthLinkState {
  /** Forget the last link outcome (e.g. once the new password is saved). */
  clear: () => void;
}

const IDLE: AuthLinkState = { status: 'idle', kind: null, errorCode: null };

const AuthLinkContext = createContext<AuthLinkContextValue>({ ...IDLE, status: 'checking', clear: () => {} });

async function exchange(link: NonNullable<AuthLink>): Promise<string | null> {
  if (link.type === 'error') return link.errorCode ?? 'link_error';
  const { error } =
    link.type === 'session'
      ? await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      : await supabase.auth.exchangeCodeForSession(link.code);
  return error ? error.code ?? 'link_error' : null;
}

export function AuthLinkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthLinkState>({ status: 'checking', kind: null, errorCode: null });
  const handled = useRef<string | null>(null);

  const handleUrl = useCallback(async (url: string | null) => {
    const link = parseAuthUrl(url);
    if (!url || !link || handled.current === url) return;
    handled.current = url; // codes are single-use; never exchange the same URL twice
    setState({ status: 'processing', kind: link.kind, errorCode: null });
    try {
      const errorCode = await exchange(link);
      setState(errorCode
        ? { status: 'error', kind: link.kind, errorCode }
        : { status: 'success', kind: link.kind, errorCode: null });
    } catch {
      setState({ status: 'error', kind: link.kind, errorCode: 'link_error' });
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Subscribe first so a link arriving while getInitialURL resolves isn't missed.
    const sub = Linking.addEventListener('url', ({ url }) => { void handleUrl(url); });
    Linking.getInitialURL()
      .then((url) => handleUrl(url))
      .catch(() => {})
      .finally(() => { if (active) setState((s) => (s.status === 'checking' ? IDLE : s)); });
    return () => { active = false; sub.remove(); };
  }, [handleUrl]);

  const clear = useCallback(() => setState(IDLE), []);
  const value = useMemo(() => ({ ...state, clear }), [state, clear]);

  return <AuthLinkContext.Provider value={value}>{children}</AuthLinkContext.Provider>;
}

export function useAuthLink() {
  return useContext(AuthLinkContext);
}
