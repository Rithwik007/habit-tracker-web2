import mongoose from 'mongoose';

const HabitProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },         // Firebase UID
  name: { type: String, required: true },           // "Home", "Trip", "Default"
  isDefault: { type: Boolean, default: false },     // true for exactly one per user
  startDate: { type: String, default: null },       // YYYY-MM-DD, optional
  endDate: { type: String, default: null },         // YYYY-MM-DD, optional
  autoRevertToDefault: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('HabitProfile', HabitProfileSchema);
