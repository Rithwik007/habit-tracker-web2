import express from 'express';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Goal from '../models/Goal.js';
import HabitProfile from '../models/HabitProfile.js';
import Note from '../models/Note.js';
import Mood from '../models/Mood.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get Profile
router.get('/:firebaseId', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseId: req.params.firebaseId });
    const habitCount = await Habit.countDocuments({ userId: req.params.firebaseId });
    
    if (!user) {
      return res.json({ onboardingCompleted: false, habitCount });
    }
    
    const userObj = user.toObject();
    if (!userObj.notifPrefs) {
      userObj.notifPrefs = {};
    }
    
    res.json({ ...userObj, habitCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update/Create Profile (supports photoURL, display_name, and onboarding status)
router.post('/profile', async (req, res) => {
  const { firebaseId, email, display_name, photoURL, onboardingCompleted } = req.body;

  if (!firebaseId) {
    return res.status(400).json({ message: 'Missing firebaseId' });
  }

  try {
    // Build only the fields we want to SET — never overwrite fields not in this request
    const setFields = { email };
    if (display_name !== undefined) setFields.display_name = display_name;
    if (photoURL !== undefined) setFields.photoURL = photoURL;
    // ONLY update onboardingCompleted if explicitly passed — never reset it
    if (onboardingCompleted !== undefined) setFields.onboardingCompleted = onboardingCompleted;

    let user = await User.findOneAndUpdate(
      { firebaseId },
      { 
        $set: setFields,
        $setOnInsert: { notifPrefs: {} }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Create a default HabitProfile if one doesn't exist for the user,
    // and link it as their activeProfileId.
    let defaultProfile = await HabitProfile.findOne({ userId: firebaseId, isDefault: true });
    if (!defaultProfile) {
      defaultProfile = await HabitProfile.create({
        userId: firebaseId,
        name: 'Default',
        isDefault: true
      });
      
      const createdDate = user.createdAt || new Date();
      const creationStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(createdDate);

      user = await User.findOneAndUpdate(
        { firebaseId },
        {
          $set: { activeProfileId: defaultProfile._id },
          $push: { profileHistory: { profileId: defaultProfile._id, activatedAt: creationStr, deactivatedAt: null } }
        },
        { new: true }
      );
      console.log(`[Users API] Created Default profile for user ${firebaseId}`);
    } else if (!user.activeProfileId) {
      const createdDate = user.createdAt || new Date();
      const creationStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(createdDate);

      user = await User.findOneAndUpdate(
        { firebaseId },
        {
          $set: { activeProfileId: defaultProfile._id },
          $push: { profileHistory: { profileId: defaultProfile._id, activatedAt: creationStr, deactivatedAt: null } }
        },
        { new: true }
      );
      console.log(`[Users API] Linked existing Default profile to user ${firebaseId}`);
    }

    // Ensure orphaned habits are linked to this default profile
    await Habit.updateMany(
      { userId: firebaseId, profileId: { $exists: false } },
      { $set: { profileId: defaultProfile._id } }
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
      { $set: { notifPrefs } },
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

// Update System Reminders (Water, etc.)
router.patch('/:firebaseId/systemReminders', async (req, res) => {
  try {
    const { systemReminders } = req.body;
    if (!systemReminders) return res.status(400).json({ message: 'systemReminders is required' });
    const user = await User.findOneAndUpdate(
      { firebaseId: req.params.firebaseId },
      { systemReminders },
      { new: true }
    );
    res.json(user);
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
    
    // Delete all notes for this user
    await Note.deleteMany({ userId: firebaseId });
    
    // Delete all goals for this user
    await Goal.deleteMany({ userId: firebaseId });
    
    // Delete all moods for this user
    await Mood.deleteMany({ userId: firebaseId });
    
    res.json({ message: 'User and all associated data permanently deleted.' });
  } catch (err) {
    console.error('User deletion error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
