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

app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb for base64 profile pics

import HabitProfile from './models/HabitProfile.js';
import User from './models/User.js';
import Habit from './models/Habit.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    
    // --- ONE-TIME MIGRATION LOGIC ---
    try {
      const users = await User.find({});
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

      for (const user of users) {
        let defaultProfile = await HabitProfile.findOne({ userId: user.firebaseId, isDefault: true });
        
        if (!defaultProfile) {
          defaultProfile = await HabitProfile.create({
            userId: user.firebaseId,
            name: 'Default',
            isDefault: true
          });

          // Use the user's actual account creation date instead of today
          const createdDate = user.createdAt || new Date();
          const creationStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(createdDate);

          await User.updateOne(
            { firebaseId: user.firebaseId },
            { 
              $set: { activeProfileId: defaultProfile._id },
              $push: { profileHistory: { profileId: defaultProfile._id, activatedAt: creationStr, deactivatedAt: null } }
            }
          );
          console.log(`[Migration] Created Default profile for ${user.firebaseId}`);
        }

        // Run this outside the if-block to ensure orphaned habits are always caught
        await Habit.updateMany(
          { userId: user.firebaseId, profileId: { $exists: false } },
          { $set: { profileId: defaultProfile._id } }
        );
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
    // ---------------------------------
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => res.send('Habit Tracker API is running...'));
app.use('/api/habits', habitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api', cronRoutes); // Exposes /api/cron-notify and /api/ping

// Start internal background jobs (also runs every minute if server stays awake)
startCronJobs();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
