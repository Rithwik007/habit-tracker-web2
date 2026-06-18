import mongoose from 'mongoose';

const MoodSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for fast queries by userId and date
MoodSchema.index({ userId: 1, date: 1 });

export default mongoose.models.Mood || mongoose.model('Mood', MoodSchema);
