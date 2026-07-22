// Lazy Supabase client singleton — only instantiated in the browser to avoid
// SSR prerender failures when env vars are empty during build time.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    // Fallback no-op client if env vars are missing (static build / dev without keys)
    if (!url || !key) {
      // Return a mock-safe partial object — page will display login screen anyway
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: (_e: any, _cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOAuth: async () => ({ data: null, error: null }),
          signOut: async () => ({ error: null }),
        }
      } as unknown as SupabaseClient;
    }
    _client = createClient(url, key);
  }
  return _client;
}
