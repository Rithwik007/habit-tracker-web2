import express from 'express';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get Profile
router.get('/:firebaseId', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseId: req.params.firebaseId });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update/Create Profile (supports photoURL and display_name)
router.post('/profile', async (req, res) => {
  const { firebaseId, email, display_name, photoURL } = req.body;

  if (!firebaseId) {
    return res.status(400).json({ message: 'Missing firebaseId' });
  }

  try {
    const updateData = { email };
    if (display_name !== undefined) updateData.display_name = display_name;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    let user = await User.findOneAndUpdate(
      { firebaseId },
      updateData,
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    console.error('Profile sync error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Update Theme Preference
router.patch('/:firebaseId/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme) return res.status(400).json({ message: 'Theme is required' });
    
    const user = await User.findOneAndUpdate(
      { firebaseId: req.params.firebaseId },
      { theme },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Notification Preferences
router.patch('/:firebaseId/notifPrefs', async (req, res) => {
  try {
    const { notifPrefs } = req.body;
    if (notifPrefs === undefined) return res.status(400).json({ message: 'notifPrefs is required' });
    const user = await User.findOneAndUpdate(
      { firebaseId: req.params.firebaseId },
      { notifPrefs },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Push Subscription
router.post('/:firebaseId/push-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ message: 'Subscription object is required' });
    const user = await User.findOneAndUpdate(
      { firebaseId: req.params.firebaseId },
      { pushSubscription: subscription },
      { new: true }
    );
    res.json({ message: 'Push subscription saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user and all associated data
router.delete('/:firebaseId', async (req, res) => {
  try {
    const { firebaseId } = req.params;
    
    // Delete user profile
    await User.deleteOne({ firebaseId });
    
    // Delete all habits for this user
    await Habit.deleteMany({ userId: firebaseId });
    
    // Note model uses mongoose.models cache since we redefine it in notes.js
    // We should safely access it or redefine it.
    const NoteSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      date: { type: String, required: true },
      content: { type: String, default: '' },
      updatedAt: { type: Date, default: Date.now }
    });
    const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
    
    // Delete all notes for this user
    await Note.deleteMany({ userId: firebaseId });
    
    res.json({ message: 'User and all associated data permanently deleted.' });
  } catch (err) {
    console.error('User deletion error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
