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
export type UserRole = 'student' | 'faculty' | 'dept_admin' | 'dean' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  streak_count: number;
  last_login: string | null;
  points: number;
  department_id?: string | null;
  section_id?: string | null;
  is_active?: boolean;
  name?: string | null;
  emp_usn_id?: string | null;
}
