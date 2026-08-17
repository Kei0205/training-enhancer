import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || 'https://upyefabaocqrfonhkqib.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || 'sb_publishable_GlYntYdFB7iN63Y8Itmhnw_LBH94ltA';

  if (url && key) {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  }

  return null;
};

export const resetSupabase = () => {
  supabaseInstance = null;
};
