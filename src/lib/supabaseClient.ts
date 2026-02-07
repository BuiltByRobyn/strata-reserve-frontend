// Re-export the single Supabase client from shared lib
// This ensures there's only one GoTrueClient instance across the app
export { supabase } from '../shared/lib/supabaseClient';
