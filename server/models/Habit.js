import mongoose from 'mongoose';

const HabitSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'HabitProfile' },
  name: { type: String, required: true },
  icon: { type: String, default: 'Star' },
  color: { type: String, default: '#3B82F6' },
  targetValue: { type: Number, default: 1 },
  unit: { type: String, default: 'times' },
  frequency: {
    type: { type: String, enum: ['daily', 'specific_days', 'times_per_week', 'every_n_days'], default: 'daily' },
    days: { type: [Number], default: [] },
    timesPerWeek: { type: Number, default: 1 },
    everyNDays: { type: Number, default: 2 }
  },
  tracksValue: { type: Boolean, default: false },
  valueUnit: { type: String, default: '' },
  valueTarget: { type: Number, default: null },
  completions: [{
    date: { type: String, required: true },
    value: { type: Number, default: null },
    status: { type: String, enum: ['completed', 'skipped', 'partial'], default: 'completed' }
  }],
  reminderMessage: { type: String, default: '' },
  reminderEnabled: { type: Boolean, default: false },
  reminderTime: { type: String, default: '08:00' },
  deadlineTime: { type: String, default: '' }, // e.g. "09:00"
  naggingInterval: { type: Number, default: 0 }, // in minutes, 0 means disabled
  lastReminderSentAt: { type: String, default: '' }, // stores "YYYY-MM-DD"
  lastNaggedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

HabitSchema.index({ userId: 1 });
HabitSchema.index({ profileId: 1 });

export default mongoose.model('Habit', HabitSchema);
