import { env } from './env';
import { supabase } from './supabaseClient';

export type AuthMode = 'required' | 'optional';

export interface RequestOptions {
  auth?: AuthMode;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.API_URL.replace(/\/+$/, '');
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  body: BodyInit | null,
  opts: RequestOptions & { jsonBody?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (opts.jsonBody) headers['Content-Type'] = 'application/json';

  const authMode: AuthMode = opts.auth ?? 'required';
  const token = await getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (authMode === 'required') {
    throw new ApiError('Not authenticated', 401, null);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      null,
    );
  }

  if (res.status === 401) {
    await supabase.auth.signOut();
    const parsed = await parseBody(res);
    throw new ApiError('Unauthorized', 401, parsed);
  }

  if (!res.ok) {
    const parsed = await parseBody(res);
    const message =
      (parsed && typeof parsed === 'object' && 'detail' in parsed
        ? String((parsed as { detail: unknown }).detail)
        : null) ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  const parsed = await parseBody(res);
  return parsed as T;
}

export const apiClient = {
  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>('GET', path, null, opts);
  },
  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>(
      'POST',
      path,
      body === undefined ? null : JSON.stringify(body),
      { ...opts, jsonBody: body !== undefined },
    );
  },
  patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return request<T>(
      'PATCH',
      path,
      body === undefined ? null : JSON.stringify(body),
      { ...opts, jsonBody: body !== undefined },
    );
  },
  delete<T>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, null, opts);
  },
  postForm<T>(path: string, formData: FormData, opts?: RequestOptions): Promise<T> {
    // Browser sets the multipart Content-Type with boundary automatically — do not override.
    return request<T>('POST', path, formData, opts);
  },
};
