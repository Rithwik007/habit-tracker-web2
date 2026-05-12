import express from 'express';
import HabitProfile from '../models/HabitProfile.js';
import Habit from '../models/Habit.js';
import User from '../models/User.js';
import { switchProfile } from '../utils/switchProfile.js';

const router = express.Router();

// GET all profiles for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    
    const profiles = await HabitProfile.find({ userId }).sort({ createdAt: 1 });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new profile
router.post('/', async (req, res) => {
  try {
    const { userId, name, startDate, endDate, autoRevertToDefault } = req.body;
    if (!userId || !name) return res.status(400).json({ message: 'userId and name are required' });

    const newProfile = await HabitProfile.create({
      userId,
      name,
      isDefault: false,
      startDate: startDate || null,
      endDate: endDate || null,
      autoRevertToDefault: autoRevertToDefault !== undefined ? autoRevertToDefault : true
    });
    
    res.json(newProfile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update profile
router.patch('/:id', async (req, res) => {
  try {
    const { name, startDate, endDate, autoRevertToDefault } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (autoRevertToDefault !== undefined) updateData.autoRevertToDefault = autoRevertToDefault;

    const updated = await HabitProfile.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await HabitProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    
    if (profile.isDefault) {
      return res.status(403).json({ message: 'Cannot delete default profile' });
    }

    const user = await User.findOne({ firebaseId: profile.userId });
    if (user && user.activeProfileId?.toString() === profile._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete active profile. Switch to another profile first.' });
    }

    // Identify habits being deleted to clean up notifPrefs
    const habitsToDelete = await Habit.find({ profileId: profile._id });
    const habitIds = habitsToDelete.map(h => h._id.toString());

    await HabitProfile.findByIdAndDelete(req.params.id);
    await Habit.deleteMany({ profileId: profile._id });
    
    // Clean up notifPrefs from User model
    if (user && user.notifPrefs && habitIds.length > 0) {
      let isModified = false;
      for (const id of habitIds) {
        if (user.notifPrefs.has(id)) {
          user.notifPrefs.delete(id);
          isModified = true;
        }
      }
      if (isModified) {
        await user.save();
      }
    }

    res.json({ message: 'Profile and associated habits deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST activate profile
router.post('/:id/activate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    
    const profile = await HabitProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (profile.userId !== userId) return res.status(403).json({ message: 'Unauthorized' });

    // Use current date strictly in Asia/Kolkata context for consistent boundary
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    
    const updatedUser = await switchProfile(userId, profile._id, todayStr);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
