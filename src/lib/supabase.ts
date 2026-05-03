import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jiausatflodfmvompyfk.supabase.co';

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  if (supabaseUrl.includes('.')) {
    supabaseUrl = `https://${supabaseUrl}`;
  } else {
    supabaseUrl = `https://${supabaseUrl}.supabase.co`;
  }
}

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export type UserRole = 'student' | 'faculty' | 'admin' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  streak_count: number;
  last_login: string | null;
  points: number;
}
