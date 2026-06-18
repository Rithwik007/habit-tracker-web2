import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

// Get all notes for a user
router.get('/:userId', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get note for a specific date
router.get('/:userId/:date', async (req, res) => {
  try {
    const note = await Note.findOne({ userId: req.params.userId, date: req.params.date });
    res.json(note || { content: '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save/Update a note
router.post('/', async (req, res) => {
  const { userId, date, content } = req.body;
  if (!userId || !date) return res.status(400).json({ message: 'userId and date are required' });
  try {
    const note = await Note.findOneAndUpdate(
      { userId, date },
      { $set: { content, updatedAt: new Date() } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(note);
  } catch (err) {
    console.error('Note save error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Delete a note
router.delete('/:userId/:date', async (req, res) => {
  try {
    await Note.deleteOne({ userId: req.params.userId, date: req.params.date });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
