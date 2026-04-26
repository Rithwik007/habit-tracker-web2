import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const YOUR_FIREBASE_UID = 'hAQHGmqW5UPQ4TOswmY09k9T9bx1';

const DEFAULT_HABITS = [
    "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
    "no wasting money", "Apply Sunscreen", "No Junk Food",
    "less Screen time (5 hrs)", "Parents", "Bathing",
    "Bread Peanut Butter", "Eggs or chicken", "College Work",
    "sleep at 11 PM", "8 hours sleep"
];

const HabitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'Star' },
  color: { type: String, default: '#3B82F6' },
  targetValue: { type: Number, default: 1 },
  unit: { type: String, default: 'times' },
  frequency: { type: String, default: 'daily' },
  activeDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  completions: [],
  createdAt: { type: Date, default: Date.now }
});

const Habit = mongoose.model('Habit', HabitSchema);

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        await Habit.deleteMany({ userId: YOUR_FIREBASE_UID });
        console.log('Cleared old habits');

        const habits = DEFAULT_HABITS.map(name => ({
            userId: YOUR_FIREBASE_UID,
            name,
            completions: []
        }));

        await Habit.insertMany(habits);
        console.log(`Successfully added ${habits.length} habits to MongoDB!`);
        
        await mongoose.disconnect();
        console.log('Done!');
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
}

seed();
