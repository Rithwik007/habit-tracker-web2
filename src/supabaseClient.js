import { createClient } from '@supabase/supabase-js'

// Hardcoded for absolute reliability to bypass Vite env injection issues
const supabaseUrl = 'https://bdybveaekogmdwsibbju.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeWJ2ZWFla29nbWR3c2liYmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTQwNjksImV4cCI6MjA4ODE5MDA2OX0.zfpUzaRgttzimylZvGIGrAOXXUiy9EofFt1qEcEIPow';

export const supabase = createClient(supabaseUrl, supabaseKey);
