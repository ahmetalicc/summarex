const REQUIRED = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

type RequiredKey = (typeof REQUIRED)[number];

function read(key: RequiredKey): string {
  const value = import.meta.env[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `[env] Missing required environment variable: ${key}. ` +
        `Copy frontend/.env.example to frontend/.env and fill it in.`,
    );
  }
  return value;
}

function readAppUrl(): string {
  const value = import.meta.env.VITE_APP_URL;
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
}

export const env = {
  API_URL: read('VITE_API_URL'),
  SUPABASE_URL: read('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: read('VITE_SUPABASE_ANON_KEY'),
  APP_URL: readAppUrl(),
} as const;
