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
    const allData = [];

    for (const user of users) {
      const habits = await Habit.find({ userId: user.firebaseId }).lean();
      allData.push({
        user: {
          name: user.display_name || 'N/A',
          email: user.email,
          onboarded: user.onboardingCompleted || false,
          created: user.createdAt
        },
        habits: habits.map(h => ({
          name: h.name,
          completions: h.completions?.length || 0,
          created: h.createdAt
        }))
      });
    }

    console.log(JSON.stringify(allData, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpData();
