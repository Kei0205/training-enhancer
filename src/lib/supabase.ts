import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = import.meta.env.VITE_SUPABASE_URL || 'https://upyefabaocqrfonhkqib.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweWVmYWJhb2NxcmZvbmhrcWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjI1NTYsImV4cCI6MjEwMDQ5ODU1Nn0.kFOAjRogwnSnjCgkP5v6FtYDV8f8fzypucFqIIg00ws';

  if (url && key) {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  }

  return null;
};

export const resetSupabase = () => {
  supabaseInstance = null;
};
