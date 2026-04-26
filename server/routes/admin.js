import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Re-use existing User model if already compiled
const UserSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true },
  email: String,
  display_name: String,
  photoURL: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const HabitSchema = new mongoose.Schema({
  userId: String,
  name: String,
  completions: [{ date: String, value: Number }],
  createdAt: { type: Date, default: Date.now }
});

const Habit = mongoose.models.Habit || mongoose.model('Habit', HabitSchema);

// GET all users (admin only - no server-side auth check, handled by frontend)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET habits for a specific user (for admin to view their analytics)
router.get('/user-habits/:uid', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.params.uid });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a user and all their data
router.delete('/user/:uid', async (req, res) => {
  const uid = req.params.uid;
  try {
    await Habit.deleteMany({ userId: uid });
    await User.deleteOne({ firebaseId: uid });
    
    // Note model uses mongoose.models cache since we redefine it in notes.js
    const NoteSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      date: { type: String, required: true },
      content: { type: String, default: '' },
      updatedAt: { type: Date, default: Date.now }
    });
    const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
    
    await Note.deleteMany({ userId: uid });
    
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
