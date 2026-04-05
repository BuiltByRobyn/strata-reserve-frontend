import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Warn if placeholders are being used
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not configured. Using placeholders.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use implicit (hash-based) flow so server-side invite/recovery links
    // work without a PKCE code_verifier that the browser never stored.
    flowType: 'implicit',
  },
});
