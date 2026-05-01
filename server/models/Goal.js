import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID
  text: { type: String, required: true },
  time: { type: String, default: '' },
  date: { type: String, required: true }, // YYYY-MM-DD
  nagTime: { type: Number, default: 0 }, // in minutes
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Goal', GoalSchema);
