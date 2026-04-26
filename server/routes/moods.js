import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const MoodSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Mood = mongoose.model('Mood', MoodSchema);

// Get mood for a specific date
router.get('/:userId/:date', async (req, res) => {
  try {
    const mood = await Mood.findOne({ userId: req.params.userId, date: req.params.date });
    res.json(mood || { score: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save mood
router.post('/', async (req, res) => {
  const { userId, date, score } = req.body;
  if (!userId || !date || !score) return res.status(400).json({ message: 'userId, date, score required' });
  try {
    const mood = await Mood.findOneAndUpdate(
      { userId, date },
      { score, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(mood);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
