import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
const FALLBACK_SUPABASE_URL = 'https://missing-env.invalid';
const FALLBACK_SUPABASE_ANON_KEY = 'missing-env-anon-key';

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }

    browserClient = createBrowserClient(
      FALLBACK_SUPABASE_URL,
      FALLBACK_SUPABASE_ANON_KEY
    );
    return browserClient;
  }

  browserClient = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );

  return browserClient;
}
