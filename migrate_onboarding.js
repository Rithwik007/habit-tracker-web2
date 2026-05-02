import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
  firebaseId: String,
  email: String,
  display_name: String,
  onboardingCompleted: Boolean,
});

const HabitSchema = new mongoose.Schema({
  userId: String,
  name: String,
});

const User = mongoose.model('User', UserSchema);
const Habit = mongoose.model('Habit', HabitSchema);

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({}).lean();
  let updated = 0;

  for (const user of users) {
    const habitCount = await Habit.countDocuments({ userId: user.firebaseId });
    if (habitCount > 0 && !user.onboardingCompleted) {
      await User.updateOne({ firebaseId: user.firebaseId }, { $set: { onboardingCompleted: true } });
      console.log(`✅ Marked ${user.display_name || user.email} as onboarded (${habitCount} habits)`);
      updated++;
    } else {
      console.log(`⏭️  Skipped ${user.display_name || user.email} (habits: ${habitCount}, already onboarded: ${user.onboardingCompleted})`);
    }
  }

  console.log(`\nDone. Updated ${updated} users.`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
