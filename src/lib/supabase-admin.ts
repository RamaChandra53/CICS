import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for admin operations
// This should only be used on the server side or in secure environments
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not defined, falling back to regular client');
    // Fallback to regular client for development
    const { createClient } = require('./supabase');
    return createClient();
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
