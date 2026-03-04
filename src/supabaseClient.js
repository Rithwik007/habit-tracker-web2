import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail-safe initialization: Check if keys are actually present and look valid
const isValidConfig = supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://');

export const supabase = isValidConfig
    ? createClient(supabaseUrl, supabaseKey)
    : null;

if (!isValidConfig) {
    console.warn('Supabase configuration is missing or invalid. Falling back to local mode.');
}
