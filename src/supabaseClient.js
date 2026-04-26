import { createClient } from '@supabase/supabase-js'

// Robust environment variable fetching with sanitization
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdybveaekogmdwsibbju.supabase.co';
let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeWJ2ZWFla29nbWR3c2liYmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTQwNjksImV4cCI6MjA4ODE5MDA2OX0.zfpUzaRgttzimylZvGIGrAOXXUiy9EofFt1qEcEIPow';

// Sanitization: If the value accidentally includes the key name (e.g. "VITE_SUPABASE_URL=http...")
if (supabaseUrl.includes('VITE_SUPABASE_URL=')) {
    supabaseUrl = supabaseUrl.replace('VITE_SUPABASE_URL=', '').trim();
}
if (supabaseKey.includes('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = supabaseKey.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
}

console.log('Supabase Client Initializing with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);
