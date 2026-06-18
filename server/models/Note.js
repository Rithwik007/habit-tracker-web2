import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for fast queries by userId and date
NoteSchema.index({ userId: 1, date: 1 });

export default mongoose.models.Note || mongoose.model('Note', NoteSchema);
