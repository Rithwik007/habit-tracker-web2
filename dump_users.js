import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
  firebaseId: String,
  email: String,
  display_name: String,
  onboardingCompleted: Boolean,
  createdAt: Date
});

const HabitSchema = new mongoose.Schema({
  userId: String,
  name: String,
  completions: Array,
  createdAt: Date
});

const User = mongoose.model('User', UserSchema);
const Habit = mongoose.model('Habit', HabitSchema);

async function dumpData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}).lean();
    console.log(`Total users found: ${users.length}`);

    for (const user of users) {
      const habits = await Habit.find({ userId: user.firebaseId }).lean();
      console.log(`User: ${user.display_name} (${user.email}) - ID: ${user.firebaseId} - Habits: ${habits.length}`);
      if (user.display_name?.includes('School') || user.email?.includes('School')) {
          console.log('!!! MATCH FOUND !!!');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpData();
