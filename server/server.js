import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import habitRoutes from './routes/habits.js';
import userRoutes from './routes/users.js';
import noteRoutes from './routes/notes.js';
import moodRoutes from './routes/moods.js';
import adminRoutes from './routes/admin.js';
import goalRoutes from './routes/goals.js';
import cronRoutes from './routes/cron.js';
import profileRoutes from './routes/profiles.js';
import startCronJobs from './cron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://habit-tracker-web2.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Policy Blocked'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // 10mb for base64 profile pics

import HabitProfile from './models/HabitProfile.js';
import User from './models/User.js';
import Habit from './models/Habit.js';
import Mood from './models/Mood.js';
import Note from './models/Note.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    
    // Ensure all indexes are synchronized
    try {
      await Promise.all([
        User.syncIndexes(),
        Habit.syncIndexes(),
        HabitProfile.syncIndexes(),
        Mood.syncIndexes(),
        Note.syncIndexes()
      ]);
      console.log('Database indexes synchronized successfully');
    } catch (indexErr) {
      console.error('Error synchronizing database indexes:', indexErr);
    }
    
    // --- ONE-TIME MIGRATION: LEGACY NOTIF PREFS TO HABIT MODEL ---
    try {
      const users = await User.find({ notifPrefs: { $exists: true, $ne: {} } });
      for (const user of users) {
        const prefs = user.notifPrefs instanceof Map ? Object.fromEntries(user.notifPrefs) : user.notifPrefs;
        for (const [habitId, pref] of Object.entries(prefs)) {
          if (pref && typeof pref === 'object' && mongoose.Types.ObjectId.isValid(habitId)) {
            await Habit.updateOne(
              { _id: habitId, reminderTime: '08:00', reminderEnabled: false }, // Only update if not already set
              { $set: { reminderTime: pref.time || '08:00', reminderEnabled: !!pref.enabled } }
            );
          }
        }
      }
      console.log('[Migration] Synced legacy notifPrefs to individual habits');
    } catch (err) {
      console.error('Migration error:', err);
    }
    // ---------------------------------
  })
  .catch(err => console.error('MongoDB connection error:', err));

import { verifyUser } from './middleware/auth.js';

app.get('/', (req, res) => res.send('Habit Tracker API is running...'));
app.use('/api/habits', verifyUser, habitRoutes);
app.use('/api/users', verifyUser, userRoutes);
app.use('/api/notes', verifyUser, noteRoutes);
app.use('/api/moods', verifyUser, moodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/goals', verifyUser, goalRoutes);
app.use('/api/profiles', verifyUser, profileRoutes);
app.use('/api', cronRoutes); // Exposes /api/cron-notify and /api/ping

// Start internal background jobs (also runs every minute if server stays awake)
startCronJobs();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Global process error handlers to log and prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal Error] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Fatal Error] Uncaught Exception thrown:', error);
  console.error('[Fatal Error] Exiting process gracefully due to uncaught exception...');
  process.exit(1);
});
