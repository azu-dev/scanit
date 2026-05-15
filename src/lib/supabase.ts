import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL is not set. ' +
    'Database saves will fail. Update .env.local with your real credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
