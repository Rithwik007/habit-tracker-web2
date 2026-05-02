import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Goal from '../models/Goal.js';

const router = express.Router();

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

// DELETE a user and ALL their data (habits, goals, notes, moods)
router.delete('/user/:uid', async (req, res) => {
  const uid = req.params.uid;
  try {
    // Delete all habits
    await Habit.deleteMany({ userId: uid });
    // Delete all goals
    await Goal.deleteMany({ userId: uid });
    // Delete user profile
    await User.deleteOne({ firebaseId: uid });

    // Notes and Moods use inline schemas — safely access via model cache
    const Note = mongoose.models.Note;
    const Mood = mongoose.models.Mood;
    if (Note) await Note.deleteMany({ userId: uid });
    if (Mood) await Mood.deleteMany({ userId: uid });

    res.json({ message: 'User and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
