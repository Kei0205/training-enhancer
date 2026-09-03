import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (url && key) {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  }

  return null;
};

export const resetSupabase = () => {
  supabaseInstance = null;
};
