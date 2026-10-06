/**
 * Pure parser for Supabase auth deep links (summarex://confirm, summarex://reset-password).
 * No imports and no globals (no URL / URLSearchParams) so it behaves the same in Hermes and node.
 *
 * Supabase delivers the result either in the fragment (implicit flow):
 *   summarex://reset-password#access_token=…&refresh_token=…&type=recovery
 * or in the query (PKCE flow):
 *   summarex://reset-password?code=…
 * and reports failures in either place:
 *   summarex://reset-password#error=access_denied&error_code=otp_expired&error_description=…
 */

/** What the link is for: `recovery` = password reset, `confirm` = email confirmation / other sign-in links. */
export type AuthLinkKind = 'recovery' | 'confirm';

export type AuthLink =
  | { kind: AuthLinkKind; type: 'session'; accessToken: string; refreshToken: string }
  | { kind: AuthLinkKind; type: 'code'; code: string }
  | { kind: AuthLinkKind; type: 'error'; errorCode: string | null }
  | null; // not an auth link, or it carries nothing to act on

function decode(value: string): string {
  const spaced = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
}

function parseParams(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decode(eq === -1 ? pair : pair.slice(0, eq));
    if (!key) continue;
    out[key] = eq === -1 ? '' : decode(pair.slice(eq + 1));
  }
  return out;
}

/** Last path segment of the link, e.g. `confirm` for summarex://confirm or exp://host:8081/--/confirm. */
function routeOf(beforeQuery: string): string {
  const afterScheme = beforeQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const segments = afterScheme.split('/').filter(Boolean);
  return (segments[segments.length - 1] ?? '').toLowerCase();
}

export function parseAuthUrl(url: string | null | undefined): AuthLink {
  if (!url) return null;

  const hashAt = url.indexOf('#');
  const fragment = hashAt === -1 ? '' : url.slice(hashAt + 1);
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);
  const beforeQuery = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);

  // Fragment wins over query if both carry the same key.
  const params = { ...parseParams(query), ...parseParams(fragment) };
  const route = routeOf(beforeQuery);
  const kind: AuthLinkKind =
    params.type === 'recovery' || (!params.type && route === 'reset-password') ? 'recovery' : 'confirm';

  if (params.error || params.error_code || params.error_description) {
    return { kind, type: 'error', errorCode: params.error_code || params.error || null };
  }
  if (params.access_token && params.refresh_token) {
    return { kind, type: 'session', accessToken: params.access_token, refreshToken: params.refresh_token };
  }
  if (params.code) {
    return { kind, type: 'code', code: params.code };
  }
  return null;
}
