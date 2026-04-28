import mongoose from 'mongoose';

const HabitSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID
  name: { type: String, required: true },
  icon: { type: String, default: 'Star' },
  color: { type: String, default: '#3B82F6' },
  targetValue: { type: Number, default: 1 },
  unit: { type: String, default: 'times' },
  frequency: { type: String, default: 'daily' },
  activeDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  completions: [{
    date: { type: String }, // Format: YYYY-MM-DD
    value: { type: Number, default: 1 }
  }],
  reminderMessage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Habit', HabitSchema);
