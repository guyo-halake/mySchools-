import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // We will generate this or keep it loose

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please check your .env file. ' +
    'Include VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Helper for multi-tenancy: current student/teacher's school_id
export const getActiveSchoolId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    return profile?.school_id || null;
};
