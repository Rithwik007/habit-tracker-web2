import { createClient } from '@supabase/supabase-js'

// For security, use environment variables in production.
// During development on Windows, if .env.local isn't loading, 
// you can temporarily hardcode these, but NEVER push them to public GitHub.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file or deployment settings.');
}

export const supabase = createClient(
    supabaseUrl || 'https://your-project.supabase.co',
    supabaseKey || 'your-anon-key'
);
