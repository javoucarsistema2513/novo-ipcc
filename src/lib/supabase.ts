import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder').trim();

// Robust sanitization: Ensure we only have the base domain/origin
// This prevents errors like edjjivudeovgfaqtonbm.supabase.co/rest/v1/auth/v1/signup
if (supabaseUrl) {
  // 1. Remove everything after the protocol and first slash (including /rest/v1)
  // 2. Ensure it starts with https://
  const match = supabaseUrl.match(/(https?:\/\/)?([^\/]+)/);
  if (match) {
    const protocol = match[1] || 'https://';
    const domain = match[2];
    supabaseUrl = `${protocol}${domain}`;
  }
}

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
