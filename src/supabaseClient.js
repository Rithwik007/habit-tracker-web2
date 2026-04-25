import { createClient } from '@supabase/supabase-js'

// Environment variables are preferred in Vite
// Using import.meta.env for standard Vite compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdybveaekogmdwsibbju.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeWJ2ZWFla29nbWR3c2liYmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTQwNjksImV4cCI6MjA4ODE5MDA2OX0.zfpUzaRgttzimylZvGIGrAOXXUiy9EofFt1qEcEIPow';

console.log('Supabase Client Initializing with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);
