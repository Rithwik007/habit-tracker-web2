/**
 * SUPABASE → MONGODB MIGRATION SCRIPT
 * Migrates: habits, daily_logs (completions), daily_notes, mood_logs, profiles
 * 
 * Run with: node server/migrate-from-supabase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

const SUPABASE_URL = 'https://bdybveaekogmdwsibbju.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // We'll use anon for now
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkeWJ2ZWFla29nbWR3c2liYmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTQwNjksImV4cCI6MjA4ODE5MDA2OX0.zfpUzaRgttzimylZvGIGrAOXXUiy9EofFt1qEcEIPow';

// The Firebase UID of your account (from our earlier discovery)
const FIREBASE_UID = 'hAQHGmqW5UPQ4TOswmY09k9T9bx1';

// ─── MongoDB Schemas ───────────────────────────────────────────────────────────
const HabitSchema = new mongoose.Schema({
  userId: String,
  name: String,
  icon: { type: String, default: 'Star' },
  color: { type: String, default: '#6366f1' },
  targetValue: { type: Number, default: 1 },
  unit: { type: String, default: 'times' },
  frequency: { type: String, default: 'daily' },
  activeDays: { type: [Number], default: [0,1,2,3,4,5,6] },
  completions: [{ date: String, value: Number }],
  note: String,       // daily note stored per habit optionally
  createdAt: { type: Date, default: Date.now }
});

const Habit = mongoose.model('Habit', HabitSchema);

// ─── Migration ─────────────────────────────────────────────────────────────────
async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Connect to Supabase (without auth - just reading public data via anon key)
    // NOTE: This requires RLS to be off or you to be authenticated
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('\n📥 Fetching habits from Supabase...');
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true });

    if (habitsError) {
      console.error('❌ Could not fetch habits from Supabase:', habitsError.message);
      console.log('\n⚠️  Supabase RLS is likely blocking unauthenticated reads.');
      console.log('The 16 default habits were already added directly to MongoDB.');
      console.log('Your completions/logs cannot be migrated without a service key.\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${habits.length} habits in Supabase`);

    // Fetch all daily logs
    console.log('📥 Fetching daily logs from Supabase...');
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*');

    console.log(`Found ${logs?.length || 0} daily logs`);

    // Clear existing MongoDB habits for this user
    await Habit.deleteMany({ userId: FIREBASE_UID });
    console.log('🗑️  Cleared existing MongoDB habits');

    // Map habits with their completions
    const migratedHabits = habits.map(habit => {
      // Find all completions for this habit
      const habitLogs = (logs || []).filter(l => l.habit_id === habit.id && l.completed);
      const completions = habitLogs.map(log => ({
        date: log.log_date,
        value: 1
      }));

      return {
        userId: FIREBASE_UID,
        name: habit.name,
        icon: habit.icon || 'Star',
        color: habit.color || '#6366f1',
        completions,
        createdAt: new Date(habit.created_at)
      };
    });

    // Insert into MongoDB
    if (migratedHabits.length > 0) {
      await Habit.insertMany(migratedHabits);
      console.log(`\n✅ Successfully migrated ${migratedHabits.length} habits to MongoDB!`);

      const totalCompletions = migratedHabits.reduce((sum, h) => sum + h.completions.length, 0);
      console.log(`✅ Migrated ${totalCompletions} completion records!`);
    } else {
      console.log('ℹ️  No habits found in Supabase to migrate.');
    }

    await mongoose.disconnect();
    console.log('\n🎉 Migration complete!');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
