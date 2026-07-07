import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Serialize auth operations within this tab only. Avoids the navigator.locks
// deadlock that hangs auth calls on mobile when a suspended tab holds the lock.
let authLockChain: Promise<unknown> = Promise.resolve();
function inMemoryLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const run = authLockChain.then(() => fn());
  authLockChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: inMemoryLock,
  },
});
