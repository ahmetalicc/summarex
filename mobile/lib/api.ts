import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://summarex-backend.onrender.com';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...(await authHeaders()),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail ?? `HTTP ${res.status}`) as Error & {
      status: number;
      body: unknown;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  entitlement: {
    me: () => apiFetch<Entitlement>('/entitlement/me'),
  },
  meetings: {
    list: (params?: { limit?: number; offset?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit != null) q.set('limit', String(params.limit));
      if (params?.offset != null) q.set('offset', String(params.offset));
      if (params?.search) q.set('search', params.search);
      const qs = q.toString() ? `?${q}` : '';
      return apiFetch<Meeting[]>(`/meetings${qs}`);
    },
    get: (id: string) => apiFetch<Meeting>(`/meetings/${id}`),
    status: (id: string) =>
      apiFetch<{ status: MeetingStatus; error_message: string | null }>(
        `/meetings/${id}/status`
      ),
    transcript: (id: string) => apiFetch<Transcript>(`/meetings/${id}/transcript`),
    summary: (id: string) => apiFetch<Summary>(`/meetings/${id}/summary`),
    update: (id: string, fields: { title?: string }) =>
      apiFetch<Meeting>(`/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }),
    delete: (id: string) => apiFetch<Meeting>(`/meetings/${id}`, { method: 'DELETE' }),
    regenerateSummary: (id: string) =>
      apiFetch<{ status: string }>(`/meetings/${id}/regenerate-summary`, { method: 'POST' }),
    share: {
      create: (id: string) =>
        apiFetch<{ token: string; share_path: string }>(`/meetings/${id}/share`, {
          method: 'POST',
        }),
      revoke: (id: string) =>
        apiFetch<void>(`/meetings/${id}/share`, { method: 'DELETE' }),
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type MeetingStatus =
  | 'queued'
  | 'transcribing'
  | 'transcribed'
  | 'summarizing'
  | 'done'
  | 'error';

export interface Entitlement {
  tier: 'free' | 'pro';
  minutes_used: number;
  minutes_limit: number;
  resets_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  duration_seconds: number | null;
  language: 'en' | 'tr' | null;
  status: MeetingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  full_text: string;
  language: string;
  segments: TranscriptSegment[];
  created_at: string;
}

export interface Summary {
  id: string;
  meeting_id: string;
  overview: string;
  decisions: string[];
  action_items: string[];
  topics: string[];
  sentiment: string | null;
  key_quotes: string[];
  created_at: string;
}
